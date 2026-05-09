import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Logo } from "./Logo";
import { useTheme } from "@/lib/theme";

type Props = { navigable?: boolean };

export function Wordmark({ navigable = true }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="홈으로 이동"
      hitSlop={8}
      onPress={() => { if (navigable) router.replace("/(tabs)/home"); }}
      style={({ pressed }) => ({
        alignItems: "center" as const,
        flexDirection: "row" as const,
        gap: 8,
        opacity: pressed && navigable ? 0.7 : 1
      })}
    >
      <Logo size={22} />
      <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "800", letterSpacing: 0.6 }}>
        A-EYE
      </Text>
    </Pressable>
  );
}
