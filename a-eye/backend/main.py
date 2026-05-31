from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from inference import InvalidImageError, run_inference
from model_loader import LoadedModel, ensure_model_file, load_model, read_model_path
from schemas import AnalyzeResponse, HealthResponse, VersionResponse

MAX_IMAGE_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    model_path = read_model_path()
    ensure_model_file(model_path)
    app.state.loaded_model = load_model(model_path)
    yield


app = FastAPI(title="A-EYE Inference API", version="1.0.0", lifespan=lifespan)

# 모바일 앱은 쿠키/세션 자격증명을 사용하지 않으므로 credentials 를 비활성화합니다.
# (allow_origins=["*"] 와 allow_credentials=True 조합은 브라우저에서 거부되며 보안상 위험합니다.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/version", response_model=VersionResponse)
async def version() -> VersionResponse:
    loaded = _loaded_model()
    return VersionResponse(model_version=loaded.model_version, model_path=loaded.model_path)


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile = File(...)) -> AnalyzeResponse:
    content_type = image.content_type or ""
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Invalid image")
    image_bytes = await image.read()
    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Invalid image")
    try:
        result = run_inference(image_bytes, _loaded_model())
        return AnalyzeResponse(**result)
    except InvalidImageError:
        raise HTTPException(status_code=400, detail="Invalid image") from None
    except RuntimeError as exc:
        message = str(exc)
        if message.startswith("Model not loaded"):
            raise HTTPException(status_code=503, detail=message) from exc
        raise


def _loaded_model() -> LoadedModel:
    return app.state.loaded_model
