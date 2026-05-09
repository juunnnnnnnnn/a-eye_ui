from pydantic import BaseModel, Field


class AnalyzeResponse(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    verdict: str
    heatmap_b64: str
    overlay_b64: str
    model_version: str
    elapsed_ms: int


class VersionResponse(BaseModel):
    model_version: str
    model_path: str


class HealthResponse(BaseModel):
    status: str
