import base64
import io
from typing import Any, Optional

import numpy as np
import torch
from PIL import Image

CAM_SIZE = 224


def png_b64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


# ─── 합성(폴백) 히트맵 ────────────────────────────────────────────────
# GradCAM 이 불가능한 경우(모델 미로드/예외)에만 사용하는 점수 기반 대체 시각화.

def deterministic_heatmap(score: float, size: int = CAM_SIZE) -> Image.Image:
    x = np.linspace(0, 1, size, dtype=np.float32)
    y = np.linspace(0, 1, size, dtype=np.float32)
    xx, yy = np.meshgrid(x, y)
    center_x = 0.28 + (score * 0.44)
    center_y = 0.72 - (score * 0.38)
    primary = np.exp(-(((xx - center_x) ** 2) / 0.055 + ((yy - center_y) ** 2) / 0.085))
    secondary = np.exp(-(((xx - 0.72) ** 2) / 0.09 + ((yy - 0.28) ** 2) / 0.06)) * (0.35 + score * 0.35)
    heat = np.clip(primary + secondary, 0, 1)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., 0] = (255 * heat).astype(np.uint8)
    rgba[..., 1] = (180 * (1 - heat)).astype(np.uint8)
    rgba[..., 2] = np.uint8(255 * (0.25 + score * 0.25))
    rgba[..., 3] = 220
    return Image.fromarray(rgba, "RGBA")


def overlay_heatmap(original: Image.Image, heatmap: Image.Image, alpha: float = 0.5) -> Image.Image:
    base = original.convert("RGBA")
    heat = heatmap.convert("RGBA").resize(base.size)
    return Image.blend(base, heat, alpha).convert("RGB")


# ─── ViT/CLIP 토큰 출력을 공간 특징맵으로 변환 ────────────────────────
# 트랜스포머 레이어 출력은 [B, tokens, C] 형태이므로 CLS 토큰을 제거하고
# [B, C, H, W] 격자로 reshape 해야 GradCAM 이 공간 히트맵을 만들 수 있습니다.

def _vit_reshape_transform(tensor: torch.Tensor) -> torch.Tensor:
    tokens = tensor[:, 1:, :]
    b, n, c = tokens.shape
    side = int(round(n ** 0.5))
    tokens = tokens.reshape(b, side, side, c)
    return tokens.permute(0, 3, 1, 2)


def _resolve_attr(model: Any, path: str) -> Optional[Any]:
    obj: Any = model
    for part in path.split("."):
        if part.endswith("]"):
            name, idx = part[:-1].split("[")
            obj = getattr(obj, name, None)
            if obj is None:
                return None
            try:
                obj = obj[int(idx)]
            except (IndexError, ValueError, TypeError):
                return None
        else:
            obj = getattr(obj, part, None)
        if obj is None:
            return None
    return obj


def find_target_layer(model: Any) -> tuple[Optional[Any], bool]:
    """(target_layer, needs_reshape) 를 반환합니다.

    A-EYE 하이브리드 모델에서 의심 영역 시각화에 가장 적합한 타겟은
    공간 정보를 유지하며 최종 판단에 기여하는 컨볼루션 브랜치입니다.

    - srm_branch(노이즈 잔차): 이미지 공간의 위·변조 흔적에 반응 → 1순위
    - fft_branch(주파수): 생성 모델 특유의 주파수 패턴 → 2순위
    - clip_encoder fc2: 트랜스포머(요청 시), CLS-only 풀링이면 신호가 약함 → 폴백

    (CLIP/ViT 브랜치는 CLS 토큰만 출력에 사용하므로 패치 토큰 기반
     GradCAM 이 사실상 무의미해, 공간 컨볼루션 브랜치를 우선합니다.)
    """
    srm = _resolve_attr(model, "srm_branch.encoder")
    if srm is not None:
        return srm, False

    fft = _resolve_attr(model, "fft_branch.conv")
    if fft is not None:
        return fft, False

    clip_fc2 = _resolve_attr(
        model, "clip_encoder.vision_model.vision_model.encoder.layers[-1].mlp.fc2"
    )
    if clip_fc2 is not None:
        return clip_fc2, True

    if not hasattr(model, "named_modules"):
        return None, False
    modules = list(model.named_modules())
    for name, module in reversed(modules):
        lowered = name.lower()
        if any(token in lowered for token in ("layer4", "conv", "blocks")):
            return module, False
    return (modules[-1][1] if modules else None), False


def _colorize_cam(grayscale: np.ndarray) -> np.ndarray:
    """0~1 CAM 을 JET 컬러맵 RGB 이미지(uint8)로 변환."""
    gray_u8 = np.uint8(255 * np.clip(grayscale, 0, 1))
    try:
        import cv2

        colored = cv2.applyColorMap(gray_u8, cv2.COLORMAP_JET)
        return cv2.cvtColor(colored, cv2.COLOR_BGR2RGB)
    except Exception:
        rgb = np.zeros((*gray_u8.shape, 3), dtype=np.uint8)
        rgb[..., 0] = gray_u8
        rgb[..., 2] = 255 - gray_u8
        return rgb


def gradcam_or_fallback(
    model: Any, input_tensor: torch.Tensor, original: Image.Image, score: float
) -> tuple[str, str]:
    try:
        from pytorch_grad_cam import GradCAM
        from pytorch_grad_cam.utils.image import show_cam_on_image
        from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

        target_layer, needs_reshape = find_target_layer(model)
        if target_layer is None:
            raise RuntimeError("No target layer")

        reshape = _vit_reshape_transform if needs_reshape else None
        target_idx = 1 if score >= 0.5 else 0

        with GradCAM(model=model, target_layers=[target_layer], reshape_transform=reshape) as cam:
            grayscale = cam(input_tensor=input_tensor, targets=[ClassifierOutputTarget(target_idx)])[0]

        grayscale = np.maximum(grayscale, 0)
        grayscale = grayscale / (grayscale.max() + 1e-8)

        rgb = np.asarray(original.resize((CAM_SIZE, CAM_SIZE)).convert("RGB"), dtype=np.float32) / 255.0
        overlay = show_cam_on_image(rgb, grayscale, use_rgb=True, image_weight=0.55)
        overlay_image = Image.fromarray(np.ascontiguousarray(overlay, dtype=np.uint8))

        heatmap_image = Image.fromarray(_colorize_cam(grayscale))
        return png_b64(heatmap_image), png_b64(overlay_image)
    except Exception:
        heatmap = deterministic_heatmap(score)
        overlay = overlay_heatmap(original, heatmap)
        return png_b64(heatmap), png_b64(overlay)
