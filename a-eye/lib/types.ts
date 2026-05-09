export type Verdict = "AI" | "REAL";

export type AnalyzeResponse = {
  score: number;
  verdict: Verdict;
  heatmap_b64: string;
  overlay_b64: string;
  model_version: string;
  elapsed_ms: number;
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
