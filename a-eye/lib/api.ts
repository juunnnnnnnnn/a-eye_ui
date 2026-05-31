import { Platform } from "react-native";
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
  if (!baseURL) {
    throw new Error("분석 서버 주소가 설정되지 않았습니다. 설정 > 연결 설정에서 백엔드 주소를 입력해 주세요.");
  }
  const fileName = imageName || "a-eye-image.jpg";
  const form = new FormData();
  if (Platform.OS === "web") {
    // 웹: uri(blob:/data:)를 실제 Blob 으로 변환해 업로드 (RN 방식은 웹에서 동작 안 함)
    const blob = await (await fetch(imageUri)).blob();
    const type = blob.type && blob.type.startsWith("image/") ? blob.type : guessMimeType(fileName);
    form.append("image", new File([blob], fileName, { type }));
  } else {
    // 네이티브: RN 이 uri 를 멀티파트 파일로 변환
    form.append("image", {
      uri: imageUri,
      name: fileName,
      type: guessMimeType(fileName)
    } as unknown as Blob);
  }

  try {
    const response = await axios.post<AnalyzeResponse>(`${baseURL}/api/analyze`, form, {
      timeout: REQUEST_TIMEOUT_MS,
      // 웹은 브라우저가 boundary 포함 Content-Type 을 자동 설정하도록 빈 헤더로 둡니다.
      headers: Platform.OS === "web" ? {} : { "Content-Type": "multipart/form-data" }
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
