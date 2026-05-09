import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";
import type { Verdict } from "@/lib/types";

type VerdictBadgeProps = { verdict: Verdict };

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const { colors } = useTheme();
  const isAi = verdict === "AI";
  const bg = isAi ? colors.aiSoft : colors.realSoft;
  const fg = isAi ? colors.ai : colors.real;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.text, { color: fg }]}>{isAi ? "AI 생성" : "실제 이미지"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center", alignSelf: "flex-start", borderRadius: 999,
    flexDirection: "row", gap: 8, paddingHorizontal: 13, paddingVertical: 8
  },
  dot: { borderRadius: 999, height: 7, width: 7 },
  text: { fontSize: 13, fontWeight: "800" }
});
