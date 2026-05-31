from pydantic import BaseModel, Field


class AnalyzeResponse(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    verdict: str
    heatmap_b64: str
    overlay_b64: str
    model_version: str
    elapsed_ms: int
    # 관점별 실제 세부 점수(AI 확률). 모델이 지원할 때만 채워집니다.
    structure_score: float | None = Field(default=None, ge=0.0, le=1.0)
    context_score: float | None = Field(default=None, ge=0.0, le=1.0)
    detail_score: float | None = Field(default=None, ge=0.0, le=1.0)


class VersionResponse(BaseModel):
    model_version: str
    model_path: str


class HealthResponse(BaseModel):
    status: str
