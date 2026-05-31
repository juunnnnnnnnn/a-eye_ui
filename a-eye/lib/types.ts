export type Verdict = "AI" | "REAL";

export type AnalyzeResponse = {
  score: number;
  verdict: Verdict;
  heatmap_b64: string;
  overlay_b64: string;
  model_version: string;
  elapsed_ms: number;
  // 관점별 실제 세부 점수(AI 확률, 0~1). 모델이 지원할 때만 채워집니다.
  structure_score?: number | null;
  context_score?: number | null;
  detail_score?: number | null;
};

export type HistoryItem = AnalyzeResponse & {
  id: string;
  imageUri: string;
  imageName: string;
  createdAt: string;
};

export type AnalyzeInput = {
  imageUri: string;
  imageName: string;
};

export type VersionResponse = {
  model_version: string;
  model_path: string;
};

export type HealthResponse = {
  status: "ok";
};
