import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import torch
from dotenv import load_dotenv

from artifact_model import build_artifact_lora_hybrid, is_artifact_lora_state_dict

logger = logging.getLogger("aeye.model")
load_dotenv()


@dataclass(frozen=True)
class LoadedModel:
    model: Any
    model_path: str
    model_version: str
    is_mock: bool
    load_error: Optional[str] = None


def read_model_path() -> str:
    return os.getenv("MODEL_PATH", "./models/best.pt")


def ensure_model_file(model_path: Optional[str] = None) -> None:
    """모델 파일이 없고 MODEL_URL 이 설정돼 있으면 시작 시 한 번 내려받습니다.

    737MB 모델 가중치는 git 저장소에 올리지 않으므로, 클라우드 배포 시
    Hugging Face Hub / S3 / 직접 링크 등의 MODEL_URL 에서 받아오도록 합니다.
    """
    import urllib.request

    path = Path(model_path or read_model_path())
    if path.exists() and path.stat().st_size > 0:
        return
    url = os.getenv("MODEL_URL", "").strip()
    if not url:
        logger.warning("MODEL_URL 이 없고 %s 도 없습니다. MOCK 모드로 동작합니다.", path)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("모델 다운로드 시작: %s -> %s", url, path)
    tmp = path.with_suffix(path.suffix + ".part")
    try:
        urllib.request.urlretrieve(url, tmp)  # noqa: S310 - 운영자가 지정한 신뢰된 URL
        tmp.replace(path)
        logger.info("모델 다운로드 완료: %s (%d bytes)", path, path.stat().st_size)
    except Exception:
        logger.exception("모델 다운로드 실패")
        if tmp.exists():
            tmp.unlink(missing_ok=True)


def read_input_size() -> int:
    raw = os.getenv("INPUT_SIZE", "224")
    try:
        return max(32, int(raw))
    except ValueError:
        return 224


def read_norm() -> tuple[list[float], list[float]]:
    mean = _read_float_list("IMAGE_MEAN", [0.485, 0.456, 0.406])
    std = _read_float_list("IMAGE_STD", [0.229, 0.224, 0.225])
    return mean, std


def load_model(model_path: Optional[str] = None) -> LoadedModel:
    path = Path(model_path or read_model_path())
    if not path.exists() or path.stat().st_size == 0:
        logger.warning("MOCK MODE: %s not found, using random predictions", path)
        return LoadedModel(model=None, model_path="MOCK", model_version="mock-0.0.0", is_mock=True)

    version = _read_version(path)
    try:
        checkpoint = torch.load(path, map_location="cpu")
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
            if isinstance(state_dict, dict) and is_artifact_lora_state_dict(state_dict):
                model = build_artifact_lora_hybrid()
                missing, unexpected = model.load_state_dict(state_dict, strict=False)
                if missing or unexpected:
                    logger.warning("Artifact model loaded with missing=%s unexpected=%s", missing, unexpected)
            else:
                raise RuntimeError("Unsupported checkpoint state_dict architecture")
        else:
            model = checkpoint
        if hasattr(model, "eval"):
            model.eval()
        logger.info("Loaded model from %s version %s", path, version)
        return LoadedModel(model=model, model_path=str(path), model_version=version, is_mock=False)
    except Exception as exc:
        reason = f"{type(exc).__name__}: {exc}"
        logger.exception("Model load failed")
        return LoadedModel(model=None, model_path=str(path), model_version=version, is_mock=False, load_error=reason)


def _read_version(path: Path) -> str:
    sidecar = Path(f"{path}.version.txt")
    if not sidecar.exists():
        return "unknown"
    value = sidecar.read_text(encoding="utf-8").strip()
    return value or "unknown"


def _read_float_list(key: str, fallback: list[float]) -> list[float]:
    raw = os.getenv(key)
    if not raw:
        return fallback
    try:
        values = [float(part.strip()) for part in raw.split(",")]
        return values if len(values) == 3 else fallback
    except ValueError:
        return fallback
