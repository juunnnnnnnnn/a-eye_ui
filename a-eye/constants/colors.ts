export type ColorTokens = {
  bg: string;
  surface: string;
  surface2: string;
  fg: string;
  muted: string;
  border: string;
  borderStrong: string;
  primary: string;
  secondary: string;
  real: string;
  uncertain: string;
  ai: string;
  realSoft: string;
  uncertainSoft: string;
  aiSoft: string;
  black: string;
  white: string;
};

export const lightColors: ColorTokens = {
  bg: "#FAFAFC",
  surface: "#FFFFFF",
  surface2: "#F1F2F7",
  fg: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  primary: "#5B6BFF",
  secondary: "#06B6D4",
  real: "#10B981",
  uncertain: "#F59E0B",
  ai: "#EF4444",
  realSoft: "rgba(16,185,129,0.12)",
  uncertainSoft: "rgba(245,158,11,0.12)",
  aiSoft: "rgba(239,68,68,0.12)",
  black: "#0A0A0A",
  white: "#FFFFFF"
};

export const darkColors: ColorTokens = {
  bg: "#0A0E1A",
  surface: "#111827",
  surface2: "#1F2937",
  fg: "#F9FAFB",
  muted: "#9CA3AF",
  border: "#1E293B",
  borderStrong: "#334155",
  primary: "#5B6BFF",
  secondary: "#06B6D4",
  real: "#10B981",
  uncertain: "#F59E0B",
  ai: "#EF4444",
  realSoft: "rgba(16,185,129,0.18)",
  uncertainSoft: "rgba(245,158,11,0.18)",
  aiSoft: "rgba(239,68,68,0.18)",
  black: "#0A0A0A",
  white: "#FFFFFF"
};

// 하위호환
export const colors = lightColors;
export const gradient = [lightColors.secondary, lightColors.primary] as const;
