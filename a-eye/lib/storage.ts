import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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

const WEB_DB_NAME = "aeye-storage";
const WEB_STORE_NAME = "keyValue";
let webDbPromise: Promise<IDBDatabase> | null = null;

function canUseIndexedDb() {
  return Platform.OS === "web" && typeof indexedDB !== "undefined";
}

function openWebDb(): Promise<IDBDatabase> {
  if (webDbPromise) {
    return webDbPromise;
  }
  webDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(WEB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WEB_STORE_NAME)) {
        request.result.createObjectStore(WEB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return webDbPromise;
}

async function webGetString(key: string): Promise<string | null> {
  const db = await openWebDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WEB_STORE_NAME, "readonly");
    const request = transaction.objectStore(WEB_STORE_NAME).get(key);
    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
    request.onerror = () => reject(request.error);
  });
}

async function webSetString(key: string, value: string): Promise<void> {
  const db = await openWebDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WEB_STORE_NAME, "readwrite");
    const request = transaction.objectStore(WEB_STORE_NAME).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function webRemoveItem(key: string): Promise<void> {
  const db = await openWebDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(WEB_STORE_NAME, "readwrite");
    const request = transaction.objectStore(WEB_STORE_NAME).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function safeGetString(key: string): Promise<string | null> {
  try {
    if (canUseIndexedDb()) {
      try {
        const value = await webGetString(key);
        if (value != null) {
          return value;
        }
      } catch {
        // Fall back to AsyncStorage's web localStorage implementation below.
      }
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function safeSetString(key: string, value: string): Promise<boolean> {
  try {
    if (canUseIndexedDb()) {
      try {
        await webSetString(key, value);
        return true;
      } catch {
        // Small values may still fit in AsyncStorage/localStorage below.
      }
    }
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function safeRemoveItem(key: string): Promise<boolean> {
  try {
    if (canUseIndexedDb()) {
      try {
        await webRemoveItem(key);
      } catch {
        // Still try removing the legacy localStorage value below.
      }
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        return true;
      }
      return true;
    }
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

export async function addHistoryItem(item: HistoryItem): Promise<HistoryItem[]> {
  const current = await loadHistory();
  return saveHistoryWithPrune([item, ...current.filter((entry) => entry.id !== item.id)]);
}

export async function clearHistory(): Promise<void> {
  await safeRemoveItem(STORAGE_KEYS.history);
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
