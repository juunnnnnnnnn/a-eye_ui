import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTheme } from "@/lib/theme";

type FallbackErrorProps = {
  title?: string;
  message?: string;
  buttonLabel?: string;
  onPress: () => void;
};

export function FallbackError({
  title = "화면을 불러오지 못했어요",
  message = "데이터가 비어 있거나 손상되었습니다. 홈에서 다시 분석을 시작해 주세요.",
  buttonLabel = "홈으로 돌아가기",
  onPress
}: FallbackErrorProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.icon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.iconText, { color: colors.primary }]}>!</Text>
      </View>
      <Text style={[styles.title, { color: colors.fg }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      <PrimaryButton label={buttonLabel} onPress={onPress} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 10, width: "100%" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  icon: {
    alignItems: "center", borderRadius: 18, borderWidth: 1,
    height: 58, justifyContent: "center", marginBottom: 18, width: 58
  },
  iconText: { fontSize: 28, fontWeight: "900" },
  message: { fontSize: 14, lineHeight: 22, marginTop: 10 },
  title: { fontSize: 24, fontWeight: "900", letterSpacing: -0.7 }
});
