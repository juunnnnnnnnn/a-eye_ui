import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { LinearGradient as RNGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { safeSetString } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";

const PAGES = [
  {
    title: "구조, 맥락, 디테일",
    accent: "세 시선이 하나의 결론으로.",
    body: "서로 다른 관점의 모델이 같은 이미지를 교차 검증해서,\n직관적인 하나의 판단 점수로 정리합니다.",
    labels: ["STRUCTURE", "CONTEXT", "DETAIL"]
  },
  {
    title: "결과보다 과정까지",
    accent: "왜 이런 점수가 나왔는지 보여줍니다.",
    body: "단순히 AI 같다고 말하는 데서 끝나지 않고,\n세부 점수와 요약 설명을 함께 제공합니다.",
    labels: ["SCAN", "VERIFY", "SUMMARY"]
  },
  {
    title: "빠르게 확인하고 저장",
    accent: "반복 분석도 한 흐름 안에서.",
    body: "이미지를 업로드하면 결과가 히스토리에 자동으로 저장되고,\n언제든 다시 꺼내볼 수 있습니다.",
    labels: ["UPLOAD", "ANALYZE", "HISTORY"]
  }
];

const ONBOARDING_KEY = "aeye.onboardingDone";

async function finish() {
  await safeSetString(ONBOARDING_KEY, "1");
  router.replace("/(tabs)/home");
}

function Illustration({ labels, bg }: { labels: string[]; bg: string }) {
  return (
    <Svg viewBox="0 0 280 220" width={280} height={220}>
      <Defs>
        <LinearGradient id="ob-a" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#06B6D4" stopOpacity={0.72} />
          <Stop offset="100%" stopColor="#06B6D4" stopOpacity={0.1} />
        </LinearGradient>
        <LinearGradient id="ob-b" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#5B6BFF" stopOpacity={0.76} />
          <Stop offset="100%" stopColor="#5B6BFF" stopOpacity={0.12} />
        </LinearGradient>
        <LinearGradient id="ob-c" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0%" stopColor="#06B6D4" stopOpacity={0.82} />
          <Stop offset="100%" stopColor="#5B6BFF" stopOpacity={0.26} />
        </LinearGradient>
      </Defs>
      <Circle cx={100} cy={90} r={62} fill="none" stroke="url(#ob-a)" strokeWidth={3.5} />
      <Circle cx={180} cy={90} r={62} fill="none" stroke="url(#ob-b)" strokeWidth={3.5} />
      <Circle cx={140} cy={140} r={62} fill="none" stroke="url(#ob-c)" strokeWidth={3.5} />
      <Circle cx={140} cy={106} r={14} fill="url(#ob-c)" />
      <Circle cx={140} cy={106} r={6} fill={bg} />
      <SvgText x={85} y={72} textAnchor="middle" fill="#06B6D4" fontSize={12} fontWeight="800" letterSpacing={1.2}>{labels[0]}</SvgText>
      <SvgText x={195} y={72} textAnchor="middle" fill="#5B6BFF" fontSize={12} fontWeight="800" letterSpacing={1.2}>{labels[1]}</SvgText>
      <SvgText x={140} y={178} textAnchor="middle" fill="#06B6D4" fontSize={12} fontWeight="800" letterSpacing={1.2}>{labels[2]}</SvgText>
    </Svg>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    accent: { color: c.muted, fontWeight: "500" },
    body: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 12 },
    bottom: { padding: 28, paddingBottom: 40 },
    cta: {
      alignItems: "center", borderRadius: 16, flexDirection: "row",
      gap: 6, justifyContent: "center", paddingVertical: 15, width: "100%"
    },
    ctaText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    ctaWrap: { marginTop: 20, width: "100%" },
    dot: { backgroundColor: c.border, borderRadius: 999, height: 6, width: 6 },
    dotActive: { backgroundColor: c.primary, width: 18 },
    dots: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 20 },
    illustrationWrap: { alignItems: "center", flex: 1, justifyContent: "center" },
    safe: { backgroundColor: c.bg, flex: 1 },
    skip: { color: c.muted, fontSize: 13, fontWeight: "500" },
    title: { color: c.fg, fontSize: 22, fontWeight: "700", letterSpacing: -0.8, lineHeight: 30 },
    topRow: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4
    },
    wordmark: { alignItems: "center", flexDirection: "row", gap: 8 },
    wordmarkText: { color: c.fg, fontSize: 16, fontWeight: "800", letterSpacing: 0.6 }
  });
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const page = PAGES[index]!;
  const isLast = index === PAGES.length - 1;

  const next = () => {
    if (isLast) void finish();
    else setIndex((i) => i + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topRow}>
        <View style={styles.wordmark}>
          <Logo size={22} />
          <Text style={styles.wordmarkText}>A-EYE</Text>
        </View>
        <Pressable onPress={() => void finish()}>
          <Text style={styles.skip}>건너뛰기</Text>
        </Pressable>
      </View>

      <View style={styles.illustrationWrap}>
        <Illustration labels={page.labels} bg={colors.bg} />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.title}>
          {page.title}{"\n"}
          <Text style={styles.accent}>{page.accent}</Text>
        </Text>
        <Text style={styles.body}>{page.body}</Text>

        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Pressable onPress={next} style={styles.ctaWrap}>
          <RNGradient
            colors={["#06B6D4", "#5B6BFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{isLast ? "시작하기" : "다음"}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </RNGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
