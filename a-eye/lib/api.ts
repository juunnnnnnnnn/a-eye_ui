import axios, { AxiosError } from "axios";
import { DEFAULT_BACKEND_URL, REQUEST_TIMEOUT_MS } from "@/constants/config";
import { safeGetString, STORAGE_KEYS } from "@/lib/storage";
import type { AnalyzeResponse, HealthResponse, VersionResponse } from "@/lib/types";

export async function getBackendUrl(): Promise<string> {
  const stored = await safeGetString(STORAGE_KEYS.backendUrl);
  return normalizeBackendUrl(stored || DEFAULT_BACKEND_URL);
}

export function normalizeBackendUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export async function analyzeImage(imageUri: string, imageName: string): Promise<AnalyzeResponse> {
  const baseURL = await getBackendUrl();
  const form = new FormData();
  form.append("image", {
    uri: imageUri,
    name: imageName || "a-eye-image.jpg",
    type: guessMimeType(imageName)
  } as unknown as Blob);

  try {
    const response = await axios.post<AnalyzeResponse>(`${baseURL}/api/analyze`, form, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function checkHealth(baseURL?: string): Promise<HealthResponse> {
  const url = normalizeBackendUrl(baseURL || (await getBackendUrl()));
  const response = await axios.get<HealthResponse>(`${url}/api/health`, { timeout: REQUEST_TIMEOUT_MS });
  return response.data;
}

export async function getVersion(baseURL?: string): Promise<VersionResponse> {
  const url = normalizeBackendUrl(baseURL || (await getBackendUrl()));
  const response = await axios.get<VersionResponse>(`${url}/api/version`, { timeout: REQUEST_TIMEOUT_MS });
  return response.data;
}

function guessMimeType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/jpeg";
}

function toFriendlyError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosError: AxiosError<{ detail?: string }> = error;
    if (axiosError.code === "ECONNABORTED") {
      return new Error("분석 요청 시간이 30초를 초과했습니다. 네트워크와 서버 상태를 확인해 주세요.");
    }
    const detail = axiosError.response?.data?.detail;
    if (detail) {
      return new Error(detail);
    }
    return new Error("서버에 연결하지 못했습니다. 설정에서 백엔드 주소를 확인해 주세요.");
  }
  return new Error("알 수 없는 오류가 발생했습니다.");
}
