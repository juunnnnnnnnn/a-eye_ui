import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BACKEND_URL } from "@/constants/config";
import { safeGetString, safeSetString, STORAGE_KEYS } from "@/lib/storage";
import { normalizeBackendUrl } from "@/lib/api";

export function useBackendUrl() {
  const [backendUrl, setBackendUrlState] = useState<string>(DEFAULT_BACKEND_URL);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    safeGetString(STORAGE_KEYS.backendUrl).then((stored) => {
      if (!mounted) {
        return;
      }
      setBackendUrlState(stored ? normalizeBackendUrl(stored) : DEFAULT_BACKEND_URL);
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setBackendUrl = useCallback(async (value: string) => {
    const normalized = normalizeBackendUrl(value);
    setBackendUrlState(normalized);
    await safeSetString(STORAGE_KEYS.backendUrl, normalized);
  }, []);

  return { backendUrl, setBackendUrl, isLoaded };
}
