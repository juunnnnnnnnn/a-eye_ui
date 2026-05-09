import { useCallback, useState } from "react";
import { analyzeImage } from "@/lib/api";
import type { AnalyzeInput, AnalyzeResponse } from "@/lib/types";

type AnalyzeState =
  | { status: "idle"; error: null; data: null }
  | { status: "loading"; error: null; data: null }
  | { status: "success"; error: null; data: AnalyzeResponse }
  | { status: "error"; error: Error; data: null };

export function useAnalyze() {
  const [state, setState] = useState<AnalyzeState>({ status: "idle", error: null, data: null });

  const run = useCallback(async (input: AnalyzeInput) => {
    setState({ status: "loading", error: null, data: null });
    try {
      const data = await analyzeImage(input.imageUri, input.imageName);
      setState({ status: "success", error: null, data });
      return data;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error("분석 중 오류가 발생했습니다.");
      setState({ status: "error", error: normalizedError, data: null });
      throw normalizedError;
    }
  }, []);

  return { ...state, run };
}
