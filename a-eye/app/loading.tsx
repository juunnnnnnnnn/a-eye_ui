import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "@/components/Logo";
import { useAnalyze } from "@/hooks/useAnalyze";
import { safeSetString, STORAGE_KEYS } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { HistoryItem } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH - 48;

type LoadingParams = { imageUri?: string; imageName?: string };

const STEPS = [
  "이미지 구조 패치 분석",
  "맥락 일관성 교차 검증",
  "디테일 판독 및 흔적 탐색",
  "최종 결과 종합"
];

function readParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    analysisImage: { borderRadius: 18, height: IMAGE_SIZE, width: IMAGE_SIZE },
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    container: { flex: 1, paddingHorizontal: 24, paddingBottom: 24 },
    filenameBadge: {
      backgroundColor: "rgba(15,23,42,0.68)", borderRadius: 999,
      bottom: 14, left: 14, maxWidth: "70%",
      paddingHorizontal: 9, paddingVertical: 6, position: "absolute"
    },
    filenameText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    imageWrap: { marginTop: 18, overflow: "hidden", position: "relative", borderRadius: 18 },
    progressFill: { borderRadius: 999, height: "100%", overflow: "hidden" },
    progressLabel: { color: c.muted, fontFamily: "monospace", fontSize: 12, fontWeight: "500" },
    progressTrack: {
      backgroundColor: c.surface2, borderRadius: 999,
      height: 8, marginTop: 18, overflow: "hidden"
    },
    quote: { color: c.muted, fontStyle: "italic", fontSize: 11, lineHeight: 16, marginTop: 16, textAlign: "center" },
    safe: { backgroundColor: c.bg, flex: 1 },
    scanLine: {
      borderRadius: 10, height: 96, left: 0, position: "absolute", right: 0, top: 0,
      overflow: "hidden", justifyContent: "flex-end",
      shadowColor: "#06B6D4", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6, shadowRadius: 16
    },
    scanEdge: {
      height: 2, backgroundColor: "#22D3EE", opacity: 0.9,
      shadowColor: "#22D3EE", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6
    },
    stepCheck: { color: "#fff", fontSize: 10, fontWeight: "800" },
    stepDot: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 999, borderWidth: 1, height: 22, justifyContent: "center", width: 22
    },
    stepDotActive: { backgroundColor: "rgba(6,182,212,0.16)", borderColor: c.secondary, borderWidth: 1.5 },
    stepDotDone: { backgroundColor: c.primary, borderColor: "transparent" },
    stepLabel: { color: c.muted, flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
    stepLabelActive: { color: c.fg, fontWeight: "600" },
    stepPulse: { backgroundColor: c.secondary, borderRadius: 999, height: 7, width: 7 },
    stepRow: { alignItems: "center", flexDirection: "row", gap: 12 },
    steps: { gap: 10, marginTop: 18 },
    subtitle: { color: c.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
    title: { color: c.fg, fontSize: 22, fontWeight: "700", letterSpacing: -0.8, marginTop: 4 },
    wordmark: { alignItems: "center", flexDirection: "row", gap: 8 },
    wordmarkText: { color: c.fg, fontSize: 16, fontWeight: "800", letterSpacing: 0.6 }
  });
}

export default function LoadingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<LoadingParams>();
  const { run } = useAnalyze();
  const [progress, setProgress] = useState(14);
  const progressRef = useRef(14);
  const mountedRef = useRef(true);

  const scanY = useSharedValue(0);
  scanY.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) })
    ),
    -1,
    false
  );

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * (IMAGE_SIZE - 90) }]
  }));

  useEffect(() => {
    mountedRef.current = true;
    const imageUri = readParam(params.imageUri);
    const imageName = readParam(params.imageName) || "image.jpg";

    const progressTimer = setInterval(() => {
      const next = Math.min(progressRef.current + 18, 96);
      progressRef.current = next;
      if (mountedRef.current) setProgress(next);
    }, 650);

    async function analyze() {
      if (!imageUri) { router.replace("/result"); return; }
      try {
        const data = await run({ imageUri, imageName });
        if (!mountedRef.current) return;
        clearInterval(progressTimer);
        setProgress(100);
        const item: HistoryItem = {
          ...data, id: `analysis-${Date.now()}`,
          imageUri, imageName, createdAt: new Date().toISOString()
        };
        await safeSetString(STORAGE_KEYS.pendingResult, JSON.stringify(item));
        setTimeout(() => router.replace("/result"), 300);
      } catch (error) {
        if (!mountedRef.current) return;
        clearInterval(progressTimer);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "서버에 연결하지 못했습니다. 설정에서 백엔드 주소를 확인해 주세요.";
        Alert.alert("분석 실패", message, [
          { text: "홈으로", style: "cancel", onPress: () => router.replace("/(tabs)/home") },
          { text: "연결 설정 열기", onPress: () => router.replace("/(tabs)/settings") }
        ]);
      }
    }

    void analyze();
    return () => { mountedRef.current = false; clearInterval(progressTimer); };
  }, []);

  const imageUri = readParam(params.imageUri);
  const imageName = readParam(params.imageName) || "image.jpg";

  const stepState = (i: number) => {
    const thresholds = [25, 50, 75, 95];
    if (progress >= thresholds[i]!) return "done";
    if (i === 0 && progress < 25) return "active";
    if (progress >= (thresholds[i - 1] ?? 0) && progress < thresholds[i]!) return "active";
    return "pending";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <View style={styles.wordmark}>
          <Logo size={22} />
          <Text style={styles.wordmarkText}>A-EYE</Text>
        </View>
        <Text style={styles.progressLabel}>{Math.min(progress, 99)}%</Text>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>
          분석 중<Text style={{ color: colors.secondary }}>...</Text>
        </Text>
        <Text style={styles.subtitle}>세 시선 모델이 이미지를 교차 검증하고 있어요</Text>

        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.analysisImage} contentFit="cover" />
          ) : (
            <View style={[styles.analysisImage, { backgroundColor: colors.surface2 }]} />
          )}
          <Animated.View style={[styles.scanLine, scanStyle]}>
            <LinearGradient
              colors={["rgba(6,182,212,0)", "rgba(6,182,212,0.28)", "rgba(91,107,255,0.28)", "rgba(91,107,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.scanEdge} />
          </Animated.View>
          <View style={styles.filenameBadge}>
            <Text style={styles.filenameText} numberOfLines={1}>{imageName}</Text>
          </View>
        </View>

        <View style={styles.steps}>
          {STEPS.map((label, i) => {
            const state = stepState(i);
            const isDone = state === "done";
            const isActive = state === "active";
            return (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepDot, isDone && styles.stepDotDone, isActive && styles.stepDotActive]}>
                  {isDone && <Text style={styles.stepCheck}>✓</Text>}
                  {isActive && <View style={styles.stepPulse} />}
                </View>
                <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%` }]}>
            <LinearGradient
              colors={["#06B6D4", "#5B6BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        <Text style={styles.quote}>AI는 종종 디테일에서 흔적을 남깁니다</Text>
      </View>
    </SafeAreaView>
  );
}
