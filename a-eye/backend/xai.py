import base64
import io
from typing import Any, Optional

import numpy as np
import torch
from PIL import Image


def png_b64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def deterministic_heatmap(score: float, size: int = 224) -> Image.Image:
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


def find_target_layer(model: Any) -> Optional[Any]:
    if not hasattr(model, "named_modules"):
        return None
    modules = list(model.named_modules())
    for name, module in reversed(modules):
        lowered = name.lower()
        if any(token in lowered for token in ("layer4", "conv", "blocks")):
            return module
    return modules[-1][1] if modules else None


def gradcam_or_fallback(model: Any, input_tensor: torch.Tensor, original: Image.Image, score: float) -> tuple[str, str]:
    try:
        from pytorch_grad_cam import GradCAM
        from pytorch_grad_cam.utils.image import show_cam_on_image

        target_layer = find_target_layer(model)
        if target_layer is None:
            raise RuntimeError("No target layer")

        with GradCAM(model=model, target_layers=[target_layer]) as cam:
            grayscale = cam(input_tensor=input_tensor)[0]
        rgb = np.asarray(original.resize((224, 224)).convert("RGB"), dtype=np.float32) / 255.0
        overlay = show_cam_on_image(rgb, grayscale, use_rgb=True)
        heat_rgb = np.uint8(255 * grayscale)
        heatmap = Image.fromarray(heat_rgb, "L").convert("RGBA")
        overlay_image = Image.fromarray(overlay).resize(original.size)
        return png_b64(heatmap.resize((224, 224))), png_b64(overlay_image)
    except Exception:
        heatmap = deterministic_heatmap(score)
        overlay = overlay_heatmap(original, heatmap)
        return png_b64(heatmap), png_b64(overlay)
