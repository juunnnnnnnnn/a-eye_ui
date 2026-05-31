import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue
} from "react-native-reanimated";
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

// ─── 앙상블 그래픽: 우주 속 세 시선이 자이로스코프처럼 회전하며 융합 ───
const GRAPHIC_W = 300;
const GRAPHIC_H = 300;
const CENTER = { x: GRAPHIC_W / 2, y: GRAPHIC_H / 2 };
const ORBIT_RX = 54; // 가로 궤도 반경
const ORBIT_RY = 25; // 세로 궤도 반경(작게 → 기울어진 평면 = 3D 착시)
const LOBE_R = 66;
const TWO_PI = Math.PI * 2;
const LOBES = [
  { color: "#06B6D4", id: "glow-a" },
  { color: "#5B6BFF", id: "glow-b" },
  { color: "#0EA5E9", id: "glow-c" }
];

// 입자(별빛) 좌표(고정) — 라이트/다크 양쪽에서 보이도록 브랜드 컬러 사용
const STARS = [
  { x: 38, y: 54, s: 2, c: "#06B6D4", ph: 0.0 },
  { x: 250, y: 70, s: 2.5, c: "#5B6BFF", ph: 0.3 },
  { x: 60, y: 230, s: 2, c: "#5B6BFF", ph: 0.6 },
  { x: 244, y: 224, s: 1.8, c: "#06B6D4", ph: 0.15 },
  { x: 150, y: 28, s: 2.2, c: "#818CF8", ph: 0.45 },
  { x: 22, y: 150, s: 1.6, c: "#06B6D4", ph: 0.75 },
  { x: 278, y: 150, s: 1.6, c: "#5B6BFF", ph: 0.9 },
  { x: 150, y: 274, s: 2, c: "#818CF8", ph: 0.25 },
  { x: 96, y: 40, s: 1.5, c: "#06B6D4", ph: 0.55 },
  { x: 206, y: 250, s: 1.5, c: "#5B6BFF", ph: 0.85 }
];

function Star({ x, y, s, c, ph, t }: { x: number; y: number; s: number; c: string; ph: number; t: SharedValue<number> }) {
  const aStyle = useAnimatedStyle(() => {
    const tw = (Math.sin((t.value + ph) * TWO_PI * 2) + 1) / 2; // 0~1 반짝임
    return { opacity: 0.25 + 0.7 * tw, transform: [{ scale: 0.7 + 0.5 * tw }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", left: x - s, top: y - s, width: s * 2, height: s * 2, borderRadius: s, backgroundColor: c }, aStyle]}
    />
  );
}

function GyroRing({
  rx, ry, color, highlight, dir, t, gid
}: { rx: number; ry: number; color: string; highlight: string; dir: number; t: SharedValue<number>; gid: string }) {
  const aStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${dir * t.value * 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width: GRAPHIC_W, height: GRAPHIC_H }, aStyle]}>
      <Svg width={GRAPHIC_W} height={GRAPHIC_H}>
        <Defs>
          {/* 한쪽은 밝고 반대편은 사라지는 빛 궤적 느낌의 스트로크 */}
          <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity={0} />
            <Stop offset="38%" stopColor={color} stopOpacity={0.9} />
            <Stop offset="62%" stopColor={highlight} stopOpacity={1} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {/* 외곽 글로우(두껍고 흐림) + 선명한 본선 */}
        <Ellipse cx={CENTER.x} cy={CENTER.y} rx={rx} ry={ry} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={6} />
        <Ellipse cx={CENTER.x} cy={CENTER.y} rx={rx} ry={ry} fill="none" stroke={`url(#${gid})`} strokeWidth={2.6} />
        {/* 궤도를 도는 발광 구슬 */}
        <Circle cx={CENTER.x + rx} cy={CENTER.y} r={8} fill={color} fillOpacity={0.3} />
        <Circle cx={CENTER.x + rx} cy={CENTER.y} r={4} fill={highlight} />
      </Svg>
    </Animated.View>
  );
}

function OrbitLobe({ color, id, phase, t }: { color: string; id: string; phase: number; t: SharedValue<number> }) {
  // t(0~1)을 따라 궤도를 돌며, 앞(아래)일수록 크고 밝게 → 깊이감
  const aStyle = useAnimatedStyle(() => {
    const ang = t.value * TWO_PI + phase;
    const depth = Math.sin(ang); // -1(뒤) ~ 1(앞)
    return {
      opacity: 0.5 + 0.34 * depth,
      transform: [
        { translateX: ORBIT_RX * Math.cos(ang) },
        { translateY: ORBIT_RY * Math.sin(ang) },
        { scale: 1 + 0.24 * depth }
      ]
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: CENTER.x - LOBE_R, top: CENTER.y - LOBE_R, width: LOBE_R * 2, height: LOBE_R * 2 },
        aStyle
      ]}
    >
      <Svg width={LOBE_R * 2} height={LOBE_R * 2}>
        <Defs>
          {/* 좌상단 하이라이트 → 구체(스피어) 같은 입체감 */}
          <RadialGradient id={id} cx="40%" cy="36%" r="65%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="26%" stopColor={color} stopOpacity={0.55} />
            <Stop offset="70%" stopColor={color} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={LOBE_R} cy={LOBE_R} r={LOBE_R} fill={`url(#${id})`} />
        <Circle cx={LOBE_R} cy={LOBE_R} r={LOBE_R - 2} fill="none" stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
      </Svg>
    </Animated.View>
  );
}

function CorePulse({ t, bg }: { t: SharedValue<number>; bg: string }) {
  const ringBase = {
    position: "absolute" as const,
    left: CENTER.x - 32,
    top: CENTER.y - 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#5B6BFF"
  };
  const ring1 = useAnimatedStyle(() => {
    const p = (t.value * 2) % 1;
    return { opacity: 0.5 * (1 - p), transform: [{ scale: 0.4 + p * 2.0 }] };
  });
  const ring2 = useAnimatedStyle(() => {
    const p = (t.value * 2 + 0.33) % 1;
    return { opacity: 0.38 * (1 - p), transform: [{ scale: 0.4 + p * 2.0 }] };
  });
  const ring3 = useAnimatedStyle(() => {
    const p = (t.value * 2 + 0.66) % 1;
    return { opacity: 0.28 * (1 - p), transform: [{ scale: 0.4 + p * 2.0 }] };
  });
  const core = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.1 * Math.sin(t.value * TWO_PI * 2) }]
  }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[ringBase, ring1]} />
      <Animated.View pointerEvents="none" style={[ringBase, ring2]} />
      <Animated.View pointerEvents="none" style={[ringBase, ring3]} />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute", left: CENTER.x - 21, top: CENTER.y - 21, width: 42, height: 42,
            borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden",
            shadowColor: "#5B6BFF", shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }
          },
          core
        ]}
      >
        <RNGradient colors={["#22D3EE", "#5B6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: bg }} />
      </Animated.View>
    </>
  );
}

function EnsembleGraphic({ bg }: { bg: string }) {
  const t = useSharedValue(0); // 궤도/펄스 (7.2s)
  const spin = useSharedValue(0); // 자이로 링 회전 (18s)
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 7200, easing: Easing.linear }), -1, false);
    spin.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
  }, []);
  return (
    <View style={{ width: GRAPHIC_W, height: GRAPHIC_H, alignItems: "center", justifyContent: "center" }}>
      {/* 배경 광채 */}
      <Svg width={GRAPHIC_W} height={GRAPHIC_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="backdrop" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#5B6BFF" stopOpacity={0.16} />
            <Stop offset="55%" stopColor="#06B6D4" stopOpacity={0.07} />
            <Stop offset="100%" stopColor="#5B6BFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={CENTER.x} cy={CENTER.y} r={CENTER.x} fill="url(#backdrop)" />
      </Svg>
      {/* 별빛 */}
      {STARS.map((s, i) => (
        <Star key={i} {...s} t={t} />
      ))}
      {/* 자이로스코프 궤도링 (서로 반대로 회전) */}
      <GyroRing rx={130} ry={52} color="#5B6BFF" highlight="#818CF8" dir={1} t={spin} gid="ring-a" />
      <GyroRing rx={58} ry={134} color="#06B6D4" highlight="#22D3EE" dir={-1} t={spin} gid="ring-b" />
      {/* 세 시선 + 코어 */}
      {LOBES.map((l, i) => (
        <OrbitLobe key={l.id} color={l.color} id={l.id} phase={(i * TWO_PI) / 3} t={t} />
      ))}
      <CorePulse t={t} bg={bg} />
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    accent: { color: c.muted, fontWeight: "500" },
    body: { color: c.muted, fontSize: 13, lineHeight: 20, marginTop: 12 },
    bottom: { padding: 28, paddingBottom: 40 },
    cta: {
      alignItems: "center", borderRadius: 16, flexDirection: "row",
      gap: 6, justifyContent: "center", paddingVertical: 16, width: "100%"
    },
    ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    ctaWrap: {
      marginTop: 22, width: "100%", borderRadius: 16,
      shadowColor: "#5B6BFF", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }
    },
    dot: { backgroundColor: c.border, borderRadius: 999, height: 6, width: 6 },
    dotActive: { backgroundColor: c.primary, width: 18 },
    dots: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 22 },
    illustrationWrap: { alignItems: "center", flex: 1, justifyContent: "center" },
    safe: { backgroundColor: c.bg, flex: 1 },
    skip: { color: c.muted, fontSize: 13, fontWeight: "500" },
    title: { color: c.fg, fontSize: 23, fontWeight: "800", letterSpacing: -0.8, lineHeight: 32 },
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
        <EnsembleGraphic bg={colors.bg} />
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
