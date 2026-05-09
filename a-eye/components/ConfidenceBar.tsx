import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

type ConfidenceBarProps = { score: number };

export function ConfidenceBar({ score }: ConfidenceBarProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const percent = Math.round(score * 100);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(score, 1)), { duration: 850 });
  }, [progress, score]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.muted }]}>AI 가능성</Text>
        <Text style={[styles.value, { color: colors.fg }]}>{percent}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
        <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  fill: { borderRadius: 999, height: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "700" },
  track: { borderRadius: 999, height: 9, overflow: "hidden" },
  value: { fontSize: 22, fontWeight: "900" }
});
