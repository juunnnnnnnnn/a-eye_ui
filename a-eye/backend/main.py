from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from inference import InvalidImageError, run_inference
from model_loader import LoadedModel, load_model, read_model_path
from schemas import AnalyzeResponse, HealthResponse, VersionResponse

MAX_IMAGE_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.loaded_model = load_model(read_model_path())
    yield


app = FastAPI(title="A-EYE Inference API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
