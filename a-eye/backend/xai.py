import base64
import io
from typing import Any, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw, ImageFilter

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


def _normalize_map(cam: np.ndarray) -> np.ndarray:
    cam = np.nan_to_num(cam.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)
    cam -= float(cam.min())
    peak = float(cam.max())
    if peak <= 1e-7:
        return np.zeros_like(cam, dtype=np.float32)
    return np.clip(cam / peak, 0.0, 1.0)


def _normalize_cam_pct(cam: np.ndarray) -> np.ndarray:
    """xai0530 style: percentile normalization + gamma for clearer hot spots."""
    cam = np.maximum(np.nan_to_num(cam.astype(np.float32)), 0.0)
    p5, p95 = np.percentile(cam, [5, 95])
    denom = max(float(p95 - p5), 1e-6)
    return np.power(np.clip((cam - p5) / denom, 0.0, 1.0), 0.75)


def _last_conv(module: nn.Module | None) -> nn.Conv2d | None:
    if module is None:
        return None
    for child in reversed(list(module.modules())):
        if isinstance(child, nn.Conv2d):
            return child
    return None


def _vit_token_target(model: nn.Module) -> nn.Module | None:
    vit = getattr(model, "vit_encoder", None)
    backbone = getattr(vit, "backbone", None)
    encoder = getattr(backbone, "encoder", None)
    layers = getattr(encoder, "layers", None)
    if layers is None:
        return None
    try:
        return layers[-1]
    except Exception:
        children = list(layers.children())
        return children[-1] if children else None


def _clip_token_target(model: nn.Module) -> nn.Module | None:
    target = _resolve_attr(
        model, "clip_encoder.vision_model.vision_model.encoder.layers[-1].mlp.fc2"
    )
    return target if isinstance(target, nn.Module) else None


def _xai0530_targets(model: nn.Module) -> list[tuple[str, str, nn.Module]]:
    targets: list[tuple[str, str, nn.Module]] = []

    clip_target = _clip_token_target(model)
    if clip_target is not None:
        targets.append(("clip_patch_gradcam", "tokens", clip_target))

    vit_target = _vit_token_target(model)
    if vit_target is not None:
        targets.append(("vit_patch_gradcam", "tokens", vit_target))

    srm = getattr(model, "srm_branch", None)
    srm_target = _last_conv(getattr(srm, "encoder", None))
    if srm_target is not None:
        targets.append(("srm_residual_gradcam", "conv", srm_target))

    return targets


def _cam_from_conv(
    activation: torch.Tensor, gradient: torch.Tensor, size: tuple[int, int]
) -> np.ndarray | None:
    if activation.ndim != 4 or gradient.ndim != 4:
        return None
    weights = gradient.mean(dim=(2, 3), keepdim=True)
    cam = F.relu((activation * weights).sum(dim=1, keepdim=True))
    cam = F.interpolate(cam, size=size, mode="bilinear", align_corners=False)
    return _normalize_map(cam[0, 0].detach().float().cpu().numpy())


def _cam_from_tokens(
    activation: torch.Tensor, gradient: torch.Tensor, size: tuple[int, int]
) -> np.ndarray | None:
    if activation.ndim != 3 or gradient.ndim != 3 or activation.shape[1] < 2:
        return None

    tokens = activation[:, 1:, :]
    grads = gradient[:, 1:, :]
    patch_count = tokens.shape[1]
    grid = int(round(patch_count ** 0.5))
    if grid * grid != patch_count:
        return None

    weights = grads.mean(dim=1, keepdim=True)
    cam = F.relu((tokens * weights).sum(dim=-1)).view(activation.shape[0], 1, grid, grid)
    cam = F.interpolate(cam, size=size, mode="bilinear", align_corners=False)
    return _normalize_map(cam[0, 0].detach().float().cpu().numpy())


def _input_gradient_map(tensor: torch.Tensor, size: tuple[int, int]) -> np.ndarray | None:
    grad = tensor.grad
    if grad is None or grad.ndim != 4:
        return None
    cam = grad.detach().float().abs().mean(dim=1, keepdim=True)
    cam = F.interpolate(cam, size=size, mode="bilinear", align_corners=False)
    return _normalize_map(cam[0, 0].cpu().numpy())


def _forward_logits(model: nn.Module, tensor: torch.Tensor) -> torch.Tensor:
    output = model(tensor)
    return output["logits"] if isinstance(output, dict) else output


def _fallback_residual_map(rgb: Image.Image, size: tuple[int, int]) -> np.ndarray:
    small = rgb.resize((size[1], size[0]), Image.Resampling.BICUBIC).convert("L")
    blur = small.filter(ImageFilter.GaussianBlur(radius=2.4))
    arr = np.asarray(small, dtype=np.float32) / 255.0
    low = np.asarray(blur, dtype=np.float32) / 255.0
    return _normalize_map(np.abs(arr - low))


def _jet_colormap(cam: np.ndarray) -> np.ndarray:
    x = np.clip(cam, 0.0, 1.0)
    r = np.clip(1.5 - np.abs(4.0 * x - 3.0), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4.0 * x - 2.0), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4.0 * x - 1.0), 0.0, 1.0)
    return np.stack([r, g, b], axis=-1)


def _show_cam_on_image(
    rgb: Image.Image, cam: np.ndarray, image_weight: float = 0.55
) -> tuple[Image.Image, Image.Image]:
    img = np.asarray(rgb.convert("RGB"), dtype=np.float32) / 255.0
    cam_img = Image.fromarray(np.uint8(_normalize_map(cam) * 255), "L").resize(
        rgb.size, Image.Resampling.BICUBIC
    )
    cam_img = cam_img.filter(ImageFilter.GaussianBlur(max(2.0, min(rgb.size) / 90.0)))
    cam_full = _normalize_map(np.asarray(cam_img, dtype=np.float32) / 255.0)
    jet = _jet_colormap(cam_full)
    overlay = np.clip(image_weight * img + (1.0 - image_weight) * jet, 0.0, 1.0)
    return (
        Image.fromarray(np.uint8(jet * 255), "RGB"),
        Image.fromarray(np.uint8(overlay * 255), "RGB"),
    )


def _localized_overlay(rgb: Image.Image, cam: np.ndarray, is_fake: bool) -> Image.Image:
    width, height = rgb.size
    img = np.asarray(rgb.convert("RGB"), dtype=np.float32) / 255.0
    cam_img = Image.fromarray(np.uint8(_normalize_map(cam) * 255), "L").resize(
        (width, height), Image.Resampling.BICUBIC
    )
    cam_img = cam_img.filter(ImageFilter.GaussianBlur(max(2.0, min(width, height) / 90.0)))
    camf = _normalize_map(np.asarray(cam_img, dtype=np.float32) / 255.0)
    jet = _jet_colormap(camf)
    base = np.clip(0.6 * img + 0.4 * jet, 0.0, 1.0)
    out = Image.fromarray(np.uint8(base * 255), "RGB")

    accent = (239, 68, 68) if is_fake else (16, 185, 129)
    mask = camf >= 0.55
    draw = ImageDraw.Draw(out)
    if int(mask.sum()) > (width * height) * 0.003:
        ys, xs = np.where(mask)
        x1, y1, x2, y2 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        thick = max(2, int(round(min(width, height) / 160)))
        for k in range(thick):
            draw.rectangle([x1 - k, y1 - k, x2 + k, y2 + k], outline=accent)
    return out


def _xai0530_images(
    model: nn.Module, input_tensor: torch.Tensor, original: Image.Image, target_class: int
) -> tuple[Image.Image, Image.Image]:
    rgb = original.convert("RGB")
    targets = _xai0530_targets(model)
    captured: dict[str, dict[str, torch.Tensor | str]] = {}
    handles = []
    was_training = model.training

    def make_hook(name: str, kind: str):
        def hook(_module: nn.Module, _inputs: tuple[Any, ...], output: Any) -> None:
            if isinstance(output, (tuple, list)):
                output = output[0]
            if not isinstance(output, torch.Tensor) or not output.requires_grad:
                return
            captured[name] = {"activation": output, "kind": kind}
            output.register_hook(lambda grad, key=name: captured[key].__setitem__("gradient", grad))

        return hook

    try:
        model.eval()
        for name, kind, module in targets:
            handles.append(module.register_forward_hook(make_hook(name, kind)))

        tensor = input_tensor.detach().clone().requires_grad_(True)
        model.zero_grad(set_to_none=True)
        with torch.enable_grad():
            logits = _forward_logits(model, tensor)
            target = logits[:, int(target_class)].sum()
            target.backward()
    finally:
        for handle in handles:
            handle.remove()
        model.train(was_training)

    size = tuple(int(v) for v in tensor.shape[-2:])
    maps: dict[str, np.ndarray] = {}
    for name, data in captured.items():
        activation = data.get("activation")
        gradient = data.get("gradient")
        kind = data.get("kind")
        if not isinstance(activation, torch.Tensor) or not isinstance(gradient, torch.Tensor):
            continue
        if kind == "tokens":
            cam = _cam_from_tokens(activation, gradient, size)
        elif kind == "conv":
            cam = _cam_from_conv(activation, gradient, size)
        else:
            cam = None
        if cam is not None:
            maps[name] = cam

    input_map = _input_gradient_map(tensor, size)
    if input_map is not None:
        maps["input_gradient"] = input_map

    if not maps:
        maps["image_highpass_residual"] = _fallback_residual_map(rgb, size)

    chosen: np.ndarray | None = None
    first_available: np.ndarray | None = None
    for name in ("clip_patch_gradcam", "vit_patch_gradcam", "srm_residual_gradcam", "input_gradient"):
        cam = maps.get(name)
        if cam is None:
            continue
        cam = _normalize_map(cam)
        if first_available is None:
            first_available = cam
        if float(cam.std()) >= 0.05:
            chosen = cam
            break
    if chosen is None:
        chosen = first_available if first_available is not None else _normalize_map(next(iter(maps.values())))

    cam = _normalize_cam_pct(chosen)
    heatmap, overlay = _show_cam_on_image(rgb, cam, image_weight=0.55)
    return heatmap, overlay


def gradcam_or_fallback(
    model: Any, input_tensor: torch.Tensor, original: Image.Image, score: float
) -> tuple[str, str]:
    try:
        target_idx = 1 if score >= 0.5 else 0
        heatmap_image, overlay_image = _xai0530_images(model, input_tensor, original, target_idx)
        return png_b64(heatmap_image), png_b64(overlay_image)
    except Exception:
        heatmap = deterministic_heatmap(score)
        overlay = overlay_heatmap(original, heatmap)
        return png_b64(heatmap), png_b64(overlay)
