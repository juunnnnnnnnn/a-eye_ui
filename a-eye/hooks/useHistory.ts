import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { HistoryItem } from "@/lib/types";
import { clearHistory, loadHistory, saveHistoryWithPrune } from "@/lib/storage";

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadHistory();
    setItems(loaded);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const addItem = useCallback(async (item: HistoryItem) => {
    const current = await loadHistory();
    const next = [item, ...current.filter((entry) => entry.id !== item.id)];
    const saved = await saveHistoryWithPrune(next);
    setItems(saved);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const current = await loadHistory();
    const saved = await saveHistoryWithPrune(current.filter((item) => item.id !== id));
    setItems(saved);
  }, []);

  const deleteAll = useCallback(async () => {
    await clearHistory();
    setItems([]);
  }, []);

  return { items, isLoading, refresh, addItem, deleteItem, deleteAll };
}
