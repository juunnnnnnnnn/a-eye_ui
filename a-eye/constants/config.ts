import Constants from "expo-constants";

type ExpoExtra = {
  defaultBackendUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const HUGGINGFACE_BACKEND_URL = "https://wonjun12-aeye-backend.hf.space";

function readConfiguredUrl(): string {
  const value = extra.defaultBackendUrl?.trim();
  if (!value || value.includes("REPLACE_WITH")) {
    return HUGGINGFACE_BACKEND_URL;
  }
  return value;
}

// 배포 앱에서는 사용자가 서버 주소를 바꾸지 않습니다. app.json 설정이 없을 때도
// 운영 Hugging Face Space로 고정해 심사/실사용 환경에서 동일하게 동작하게 합니다.
export const DEFAULT_BACKEND_URL = readConfiguredUrl();

export const AI_THRESHOLD = 0.5;
export const MAX_IMAGE_SIZE = 720;
export const HISTORY_LIMIT = 100;
export const REQUEST_TIMEOUT_MS = 120000;

// 공유 카드 QR/링크가 가리키는 주소.
// 출시 후 실제 Google Play 스토어 주소로 교체하세요. 예:
//   "https://play.google.com/store/apps/details?id=com.aeye.app"
export const APP_SHARE_URL = "https://play.google.com/store/apps/details?id=com.aeye.app";
