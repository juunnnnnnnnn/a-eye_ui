import Constants from "expo-constants";

type ExpoExtra = {
  defaultBackendUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

function readConfiguredUrl(): string {
  const value = extra.defaultBackendUrl?.trim();
  if (!value || value.includes("REPLACE_WITH")) {
    return "";
  }
  return value;
}

// 배포된 백엔드의 HTTPS 주소(app.json > extra.defaultBackendUrl)에서 읽어옵니다.
// 설정되지 않으면 빈 문자열이며, 앱은 사용자가 설정에서 주소를 입력하도록 안내합니다.
// (이전의 http LAN IP 자동 fallback은 심사관/실사용자 환경에서 동작하지 않고
//  평문 HTTP는 iOS/Android 기본 정책에서 차단되므로 제거했습니다.)
export const DEFAULT_BACKEND_URL = readConfiguredUrl();

export const AI_THRESHOLD = 0.5;
export const MAX_IMAGE_SIZE = 720;
export const HISTORY_LIMIT = 100;
export const REQUEST_TIMEOUT_MS = 30000;

// 공유 카드 QR/링크가 가리키는 주소.
// 출시 후 실제 Google Play 스토어 주소로 교체하세요. 예:
//   "https://play.google.com/store/apps/details?id=com.aeye.app"
export const APP_SHARE_URL = "https://play.google.com/store/apps/details?id=com.aeye.app";
