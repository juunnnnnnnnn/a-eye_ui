import hashlib
import io
import random
import time
from typing import Any

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError

from model_loader import LoadedModel, read_input_size, read_norm
from xai import deterministic_heatmap, gradcam_or_fallback, overlay_heatmap, png_b64


class InvalidImageError(ValueError):
    pass


def run_inference(image_bytes: bytes, loaded: LoadedModel) -> dict[str, Any]:
    started = time.perf_counter()
    original = _decode_image(image_bytes)

    if loaded.is_mock:
        score = _mock_score(image_bytes)
        heatmap = deterministic_heatmap(score)
        overlay = overlay_heatmap(original, heatmap)
        return {
            "score": score,
            "verdict": "AI" if score >= 0.5 else "REAL",
            "heatmap_b64": png_b64(heatmap),
            "overlay_b64": png_b64(overlay),
            "model_version": loaded.model_version,
            "elapsed_ms": _elapsed_ms(started),
        }

    if loaded.load_error:
        raise RuntimeError(f"Model not loaded: {loaded.load_error}")

    input_tensor = _preprocess(original)
    score = _score_model(loaded.model, input_tensor, image_bytes)
    heatmap_b64, overlay_b64 = gradcam_or_fallback(loaded.model, input_tensor, original, score)
    return {
        "score": score,
        "verdict": "AI" if score >= 0.5 else "REAL",
        "heatmap_b64": heatmap_b64,
        "overlay_b64": overlay_b64,
        "model_version": loaded.model_version,
        "elapsed_ms": _elapsed_ms(started),
    }


def _decode_image(image_bytes: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise InvalidImageError("Invalid image") from exc


def _preprocess(image: Image.Image) -> torch.Tensor:
    input_size = read_input_size()
    resized = image.resize((input_size, input_size))
    array = np.asarray(resized, dtype=np.float32) / 255.0
    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0)
    return tensor


def _preprocess_imagenet(image: Image.Image) -> torch.Tensor:
    input_size = read_input_size()
    mean, std = read_norm()
    resized = image.resize((input_size, input_size))
    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = (array - np.array(mean, dtype=np.float32)) / np.array(std, dtype=np.float32)
    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0)
    return tensor


def _score_model(model: Any, input_tensor: torch.Tensor, image_bytes: bytes) -> float:
    if not hasattr(model, "__call__"):
        return _mock_score(image_bytes)
    if not getattr(model, "expects_raw_input", False):
        input_tensor = _preprocess_imagenet(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    with torch.no_grad():
        output = model(input_tensor)
    if isinstance(output, (tuple, list)):
        output = output[0]
    if not isinstance(output, torch.Tensor):
        return _mock_score(image_bytes)
    flat = output.detach().float().reshape(output.shape[0], -1)
    if flat.shape[1] == 1:
        score = torch.sigmoid(flat[0, 0]).item()
    else:
        score = torch.softmax(flat[0, :2], dim=0)[1].item()
    return float(max(0.0, min(1.0, score)))


def _mock_score(image_bytes: bytes) -> float:
    digest = hashlib.sha256(image_bytes).digest()
    seed = int.from_bytes(digest[:8], "big")
    random.seed(seed)
    return random.random()


def _elapsed_ms(started: float) -> int:
    return int((time.perf_counter() - started) * 1000)
