import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "@/lib/theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, disabled = false, variant = "primary", style }: PrimaryButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, shadowColor: colors.primary },
        variant === "secondary" && { backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1, shadowOpacity: 0 },
        variant === "danger" && { backgroundColor: colors.ai },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      <Text style={[
        styles.label,
        { color: "#fff" },
        variant === "secondary" && { color: colors.fg }
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center", borderRadius: 16, justifyContent: "center",
    minHeight: 52, paddingHorizontal: 20, paddingVertical: 14,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 22
  },
  disabled: { opacity: 0.45 },
  label: { fontSize: 15, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.98 }] }
});
