import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, type ColorTokens } from "@/constants/colors";
import { safeGetString, safeSetString } from "@/lib/storage";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  colors: ColorTokens;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  resolved: "light",
  colors: lightColors,
  setMode: () => {}
});

const THEME_KEY = "aeye.themeMode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    void safeGetString(THEME_KEY).then((v) => {
      if (v === "dark" || v === "light" || v === "system") setModeState(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void safeSetString(THEME_KEY, m);
  }, []);

  const resolved: ResolvedTheme =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const themeColors = resolved === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, resolved, colors: themeColors, setMode }),
    [mode, resolved, themeColors, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
