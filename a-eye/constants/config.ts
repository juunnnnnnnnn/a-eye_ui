import Constants from "expo-constants";

type ExpoExtra = {
  defaultBackendUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const DEFAULT_BACKEND_URL =
  extra.defaultBackendUrl && !extra.defaultBackendUrl.includes("REPLACE_WITH")
    ? extra.defaultBackendUrl
    : "http://192.168.0.21:8000";

export const AI_THRESHOLD = 0.5;
export const MAX_IMAGE_SIZE = 720;
export const HISTORY_LIMIT = 100;
export const REQUEST_TIMEOUT_MS = 30000;
