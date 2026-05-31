import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient as RNGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { LEGAL_EFFECTIVE_DATE } from "@/constants/legal";
import { safeSetString, STORAGE_KEYS } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";

async function accept() {
  await safeSetString(STORAGE_KEYS.consent, LEGAL_EFFECTIVE_DATE);
  router.replace("/onboarding");
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    bullet: { color: c.muted, fontSize: 13, lineHeight: 20 },
    bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: 8, marginTop: 10 },
    card: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16
    },
    checkBox: {
      alignItems: "center",
      borderColor: c.borderStrong,
      borderRadius: 7,
      borderWidth: 1.5,
      height: 24,
      justifyContent: "center",
      width: 24
    },
    checkBoxOn: { backgroundColor: c.primary, borderColor: c.primary },
    checkRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      marginTop: 18,
      paddingVertical: 4
    },
    checkText: { color: c.fg, flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 19 },
    container: { flexGrow: 1, padding: 24, paddingBottom: 16 },
    cta: {
      alignItems: "center",
      borderRadius: 16,
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      paddingVertical: 16,
      width: "100%"
    },
    ctaDisabled: { opacity: 0.45 },
    ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    footer: { padding: 24, paddingTop: 8 },
    head: { alignItems: "center", gap: 12, marginBottom: 22, marginTop: 12 },
    intro: { color: c.muted, fontSize: 14, lineHeight: 22 },
    link: { color: c.primary, fontWeight: "700" },
    safe: { backgroundColor: c.bg, flex: 1 },
    title: { color: c.fg, fontSize: 22, fontWeight: "800", letterSpacing: 1.2, marginTop: 4 }
  });
}

function Bullet({ text, style }: { text: string; style: ReturnType<typeof makeStyles> }) {
  const { colors } = useTheme();
  return (
    <View style={style.bulletRow}>
      <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginTop: 2 }} />
      <Text style={style.bullet}>{text}</Text>
    </View>
  );
}

export default function ConsentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [agreed, setAgreed] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Logo size={56} />
          <Text style={styles.title}>A-EYE</Text>
        </View>

        <Text style={styles.intro}>
          A-EYE를 시작하기 전에 약관과 개인정보 처리방침을 확인해 주세요. 핵심 내용을 간단히 요약했어요.
        </Text>

        <View style={[styles.card, { marginTop: 18 }]}>
          <Bullet text="분석 결과는 AI 생성 가능성에 대한 참고용 추정치이며, 진위를 확정하지 않습니다." style={styles} />
          <Bullet text="분석 기록은 회원가입 없이 이용자의 기기에만 저장됩니다." style={styles} />
          <Bullet text="이미지는 분석 추론을 위해서만 서버로 전송되며 학습용으로 보관하지 않습니다." style={styles} />
          <Bullet text="카메라·사진 권한은 해당 기능을 사용할 때만 요청됩니다." style={styles} />
        </View>

        <Pressable style={styles.checkRow} onPress={() => setAgreed((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
          <View style={[styles.checkBox, agreed && styles.checkBoxOn]}>
            {agreed ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
          </View>
          <Text style={styles.checkText}>
            <Text style={styles.link} onPress={() => router.push({ pathname: "/doc", params: { topic: "terms" } })}>
              이용약관
            </Text>
            {" 및 "}
            <Text style={styles.link} onPress={() => router.push({ pathname: "/doc", params: { topic: "privacy" } })}>
              개인정보 처리방침
            </Text>
            에 동의합니다.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => agreed && void accept()} disabled={!agreed}>
          <RNGradient
            colors={["#06B6D4", "#5B6BFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cta, !agreed && styles.ctaDisabled]}
          >
            <Text style={styles.ctaText}>동의하고 시작하기</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </RNGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
