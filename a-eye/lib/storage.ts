import AsyncStorage from "@react-native-async-storage/async-storage";
import { HISTORY_LIMIT } from "@/constants/config";
import type { HistoryItem } from "@/lib/types";

export const STORAGE_KEYS = {
  backendUrl: "aeye.backendUrl",
  history: "aeye.history",
  pendingResult: "aeye.pendingResult",
  consent: "aeye.consentAccepted",
  onboarding: "aeye.onboardingDone",
  autoSave: "aeye.autoSave"
} as const;

export async function safeGetString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function safeSetString(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function safeRemoveItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function parseHistory(raw: string | null): HistoryItem[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isHistoryItem);
  } catch {
    return [];
  }
}

export async function loadHistory(): Promise<HistoryItem[]> {
  return parseHistory(await safeGetString(STORAGE_KEYS.history));
}

export async function saveHistoryWithPrune(items: HistoryItem[]): Promise<HistoryItem[]> {
  let next = items.slice(0, HISTORY_LIMIT);
  while (next.length >= 0) {
    const ok = await safeSetString(STORAGE_KEYS.history, JSON.stringify(next));
    if (ok) {
      return next;
    }
    if (next.length === 0) {
      return [];
    }
    next = next.slice(0, -1);
  }
  return [];
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.history);
  } catch {
    return;
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Partial<HistoryItem>;
  return (
    typeof item.id === "string" &&
    typeof item.imageUri === "string" &&
    typeof item.imageName === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.score === "number" &&
    (item.verdict === "AI" || item.verdict === "REAL") &&
    typeof item.heatmap_b64 === "string" &&
    typeof item.overlay_b64 === "string" &&
    typeof item.model_version === "string" &&
    typeof item.elapsed_ms === "number"
  );
}
