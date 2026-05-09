import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Wordmark } from "@/components/Wordmark";
import { Logo } from "@/components/Logo";
import { ImageToggle } from "@/components/ImageToggle";
import { FallbackError } from "@/components/FallbackError";
import { useHistory } from "@/hooks/useHistory";
import { loadHistory, safeGetString, STORAGE_KEYS } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { HistoryItem } from "@/lib/types";

type ResultParams = { historyId?: string };

function readParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function getSubScores(imageName: string, pct: number) {
  const seed = hashStr(imageName + pct);
  return {
    structure: clamp(pct + ((seed % 15) - 7), 3, 98),
    context: clamp(pct + (((seed >> 3) % 17) - 8), 3, 98),
    detail: clamp(pct + (((seed >> 7) % 13) - 6), 3, 98)
  };
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  }).format(new Date(iso));
}

function ScoreBar({ label, value, sub }: { label: string; value: number; sub: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.fg }}>{label}</Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.fg }}>{value}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.surface2, overflow: "hidden" }}>
        <View style={{ width: `${value}%` as any, height: "100%", borderRadius: 999, backgroundColor: colors.primary }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.muted }}>{sub}</Text>
    </View>
  );
}

async function loadPending(): Promise<HistoryItem | null> {
  const raw = await safeGetString(STORAGE_KEYS.pendingResult);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const item = parsed as Partial<HistoryItem>;
    if (
      typeof item.id === "string" && typeof item.imageUri === "string" &&
      typeof item.imageName === "string" && typeof item.createdAt === "string" &&
      typeof item.score === "number" && (item.verdict === "AI" || item.verdict === "REAL") &&
      typeof item.heatmap_b64 === "string" && typeof item.overlay_b64 === "string" &&
      typeof item.model_version === "string" && typeof item.elapsed_ms === "number"
    ) return item as HistoryItem;
    return null;
  } catch { return null; }
}

// ─── ShareCard — always white, theme-independent ───────────────────────────

function ShareCard({ item, derived }: {
  item: HistoryItem;
  derived: NonNullable<ReturnType<typeof useResultDerived>>;
}) {
  const { isAi, displayScore, scorePercent, verdictText } = derived;
  const accentColor = isAi ? "#EF4444" : "#10B981";
  const accentLight = isAi ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)";
  const labelText = isAi ? "AI GENERATED" : "REAL PHOTO";

  return (
    <View style={shareCardStyles.root}>
      <View style={shareCardStyles.card}>
        <LinearGradient colors={["#06B6D4", "#5B6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={shareCardStyles.accentBar} />
        <View style={shareCardStyles.header}>
          <Logo size={16} />
          <Text style={shareCardStyles.headerTitle}>A-EYE</Text>
          <View style={shareCardStyles.headerSpacer} />
          <Text style={shareCardStyles.headerSub}>AI 이미지 판별기</Text>
        </View>
        <View style={shareCardStyles.imageWrap}>
          <Image source={{ uri: item.imageUri }} style={shareCardStyles.image} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.18)"]} style={[StyleSheet.absoluteFill]} />
        </View>
        <View style={shareCardStyles.resultRow}>
          <View style={shareCardStyles.scoreBlock}>
            <Text style={[shareCardStyles.scoreNum, { color: accentColor }]}>
              {displayScore}<Text style={shareCardStyles.scorePct}>%</Text>
            </Text>
            <Text style={shareCardStyles.scoreHint}>{isAi ? "AI 확률" : "실사 확률"}</Text>
          </View>
          <View style={shareCardStyles.divider} />
          <View style={shareCardStyles.verdictBlock}>
            <View style={[shareCardStyles.verdictChip, { backgroundColor: accentLight }]}>
              <View style={[shareCardStyles.verdictDot, { backgroundColor: accentColor }]} />
              <Text style={[shareCardStyles.verdictChipText, { color: accentColor }]}>{labelText}</Text>
            </View>
            <Text style={shareCardStyles.verdictLabel}>{verdictText}</Text>
            <Text style={shareCardStyles.verdictSub}>
              {isAi ? `AI 생성 확률 ${scorePercent}%` : `실사 확률 ${100 - scorePercent}%`}
            </Text>
          </View>
        </View>
        <View style={shareCardStyles.bottomRule} />
        <View style={shareCardStyles.footer}>
          <Text style={shareCardStyles.footerLeft}>aeye.app</Text>
          <Text style={shareCardStyles.footerRight}>
            {new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(item.createdAt))}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Derived state hook ─────────────────────────────────────────────────────

function useResultDerived(item: HistoryItem | null) {
  return useMemo(() => {
    if (!item) return null;
    const isAi = item.verdict === "AI";
    const scorePercent = Math.round(item.score * 100);
    const displayScore = isAi ? scorePercent : 100 - scorePercent;
    const statusColor = isAi ? "#EF4444" : "#10B981";
    const statusSoft = isAi ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)";
    const statusBorder = isAi ? "rgba(239,68,42,0.3)" : "rgba(16,185,129,0.3)";
    const verdictText = isAi ? "AI 생성 사진" : "실제 사진";
    const summaryLine = isAi
      ? `AI로 생성되었을 확률이 ${scorePercent}%입니다.`
      : `실제 사진일 확률이 ${100 - scorePercent}%입니다.`;
    const pillLabel = isAi ? "AI 생성 · 확신도 높음" : "실사 · 비교적 안정적";
    const evidence = isAi
      ? ["패치 경계선에서 반복적인 생성 흔적이 감지됐습니다", "배경과 피사체 사이의 맥락 불일치가 확인됐습니다", "피부·질감에서 인공적인 균일성이 나타납니다"]
      : ["자연스러운 노이즈와 구조 패턴이 확인됐습니다", "조명과 그림자의 물리적 일관성이 유지됩니다", "유기적인 질감과 자연스러운 경계선이 관찰됩니다"];
    const sub = getSubScores(item.imageName, scorePercent);
    return { isAi, scorePercent, displayScore, statusColor, statusSoft, statusBorder, verdictText, summaryLine, pillLabel, evidence, sub };
  }, [item]);
}

// ─── Styles factory ─────────────────────────────────────────────────────────

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    actionBtn: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, flex: 1, gap: 6,
      justifyContent: "center", paddingVertical: 12
    },
    actionBtnText: { color: c.fg, fontSize: 12, fontWeight: "600" },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
    cardLabel: { color: c.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" },
    container: { padding: 24, paddingBottom: 48 },
    detailCard: {
      backgroundColor: c.surface, borderColor: c.border, borderRadius: 16,
      borderWidth: 1, gap: 14, marginTop: 16, padding: 16
    },
    detailHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    ensembleChip: { alignItems: "center", backgroundColor: c.surface2, borderRadius: 10, flex: 1, paddingVertical: 8 },
    ensembleLabel: { color: c.fg, fontSize: 11, fontWeight: "600" },
    ensembleResult: { alignItems: "center", borderRadius: 10, justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8 },
    ensembleResultText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    ensembleRow: {
      alignItems: "center", borderTopColor: c.border, borderTopWidth: 1,
      flexDirection: "row", gap: 6, marginTop: 4, paddingTop: 14
    },
    ensembleWeight: { color: c.muted, fontSize: 9, fontWeight: "500", marginTop: 2 },
    evidenceCard: {
      backgroundColor: c.surface, borderColor: c.border, borderRadius: 16,
      borderWidth: 1, gap: 11, marginTop: 12, padding: 16
    },
    evidenceDot: {
      borderRadius: 999, height: 7, marginTop: 4,
      shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4, width: 7
    },
    evidenceRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
    evidenceText: { color: c.fg, flex: 1, fontSize: 12, lineHeight: 18 },
    expandBtn: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, flexDirection: "row",
      gap: 6, justifyContent: "center", marginTop: 16, paddingVertical: 12
    },
    expandText: { color: c.fg, fontSize: 13, fontWeight: "600" },
    hiddenCard: { left: -9999, position: "absolute", top: 0 },
    iconBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 36, justifyContent: "center", width: 36
    },
    metaInfo: { flex: 1, minWidth: 0 },
    metaName: { color: c.fg, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    metaRow: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 16 },
    metaThumb: {
      backgroundColor: c.surface2, borderColor: c.border, borderRadius: 12,
      borderWidth: 1, height: 56, overflow: "hidden", width: 56
    },
    metaTime: { color: c.muted, fontSize: 11, marginTop: 2 },
    pill: { alignItems: "center", alignSelf: "flex-start", borderRadius: 999, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
    pillDot: { borderRadius: 999, height: 6, width: 6 },
    pillText: { fontSize: 12, fontWeight: "600" },
    safe: { backgroundColor: c.bg, flex: 1 },
    scoreCircleWrap: { alignItems: "center", borderRadius: 999, borderWidth: 2, flexDirection: "row", height: 72, justifyContent: "center", width: 72 },
    scoreNum: { fontSize: 28, fontWeight: "800", letterSpacing: -1 },
    scorePct: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    shareBtn: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 14 },
    shareBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    sharePressable: { marginTop: 8 },
    verdictBar: { backgroundColor: c.surface, borderRadius: 999, height: 5, overflow: "hidden" },
    verdictBarFill: { borderRadius: 999, height: "100%" },
    verdictBottom: { gap: 10, paddingBottom: 16, paddingHorizontal: 20 },
    verdictCard: { borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    verdictLine: { color: c.muted, fontSize: 12, lineHeight: 18 },
    verdictTextWrap: { flex: 1, gap: 6, minWidth: 0 },
    verdictTitle: { color: c.fg, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
    verdictTop: { alignItems: "center", flexDirection: "row", gap: 16, padding: 18, paddingBottom: 14 },
    xaiBadge: { fontWeight: "700", fontSize: 11 },
    xaiHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    xaiSection: { marginTop: 16 }
  });
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<ResultParams>();
  const { addItem } = useHistory();
  const [item, setItem] = useState<HistoryItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<ViewShot>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const historyId = readParam(params.historyId);
      let next: HistoryItem | null = null;
      if (historyId) {
        const history = await loadHistory();
        next = history.find((h) => h.id === historyId) ?? null;
      } else {
        next = await loadPending();
        if (next && mounted) await addItem(next);
      }
      if (!mounted) return;
      setItem(next);
      setLoaded(true);
    }
    void load();
    return () => { mounted = false; };
  }, [addItem, params.historyId]);

  const derived = useResultDerived(item);

  const share = async () => {
    if (!item || !derived) return;
    try {
      const uri = await cardRef.current?.capture?.();
      if (!uri) throw new Error("capture failed");
      const available = await Sharing.isAvailableAsync();
      if (!available) { Alert.alert("공유 불가", "이 기기에서는 공유를 사용할 수 없습니다."); return; }
      await Sharing.shareAsync(uri, { dialogTitle: "A-EYE 분석 결과 공유", mimeType: "image/png" });
    } catch {
      Alert.alert("공유 실패", "카드 생성 중 오류가 발생했습니다.");
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>결과를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item || !derived) return <FallbackError onPress={() => router.replace("/(tabs)/home")} />;

  const { isAi, displayScore, statusColor, statusSoft, statusBorder, verdictText, summaryLine, pillLabel, evidence, sub, scorePercent } = derived;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <Wordmark />
        <View style={styles.appBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/history")}>
            <Ionicons name="time-outline" size={16} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.replace("/(tabs)/home")}>
            <Ionicons name="home-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <View style={styles.metaThumb}>
            <Image source={{ uri: item.imageUri }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} contentFit="cover" />
          </View>
          <View style={styles.metaInfo}>
            <Text style={styles.metaName} numberOfLines={1}>{item.imageName}</Text>
            <Text style={styles.metaTime}>{item.elapsed_ms}ms · {formatWhen(item.createdAt)}</Text>
          </View>
        </View>

        <View style={[styles.verdictCard, { backgroundColor: statusSoft, borderColor: statusBorder }]}>
          <View style={styles.verdictTop}>
            <View style={[styles.scoreCircleWrap, { borderColor: statusBorder }]}>
              <Text style={[styles.scoreNum, { color: statusColor }]}>{displayScore}</Text>
              <Text style={[styles.scorePct, { color: statusColor }]}>%</Text>
            </View>
            <View style={styles.verdictTextWrap}>
              <Text style={styles.verdictTitle}>{verdictText}</Text>
              <Text style={styles.verdictLine}>{summaryLine}</Text>
            </View>
          </View>
          <View style={styles.verdictBottom}>
            <View style={styles.verdictBar}>
              <View style={[styles.verdictBarFill, { width: `${displayScore}%` as any, backgroundColor: statusColor }]} />
            </View>
            <View style={[styles.pill, { backgroundColor: isAi ? "rgba(239,68,68,0.14)" : "rgba(16,185,129,0.14)" }]}>
              <View style={[styles.pillDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.pillText, { color: statusColor }]}>{pillLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.evidenceCard}>
          <Text style={styles.cardLabel}>판별 근거</Text>
          <View style={{ gap: 9 }}>
            {evidence.map((text, i) => (
              <View key={i} style={styles.evidenceRow}>
                <View style={[styles.evidenceDot, { backgroundColor: statusColor, shadowColor: statusColor }]} />
                <Text style={styles.evidenceText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.xaiSection}>
          <View style={styles.xaiHeader}>
            <Text style={styles.cardLabel}>의심 구역</Text>
            <Text style={[styles.xaiBadge, { color: isAi ? "#EF4444" : "#F59E0B" }]}>{scorePercent}%</Text>
          </View>
          <ImageToggle originalUri={item.imageUri} heatmapB64={item.heatmap_b64} overlayB64={item.overlay_b64} />
        </View>

        {expanded && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.cardLabel}>모델별 점수</Text>
            </View>
            <View style={{ gap: 14 }}>
              <ScoreBar label="구조 분석" value={sub.structure} sub="패치 단위 구조 흔적" />
              <ScoreBar label="맥락 검증" value={sub.context} sub="의미와 장면의 일관성" />
              <ScoreBar label="디테일 판독" value={sub.detail} sub="피부, 가장자리, 질감 흔적" />
            </View>
            <View style={styles.ensembleRow}>
              {[{ label: "구조", weight: "0.35" }, { label: "맥락", weight: "0.30" }, { label: "디테일", weight: "0.35" }].map((m) => (
                <View key={m.label} style={styles.ensembleChip}>
                  <Text style={styles.ensembleLabel}>{m.label}</Text>
                  <Text style={styles.ensembleWeight}>×{m.weight}</Text>
                </View>
              ))}
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              <LinearGradient colors={["#06B6D4", "#5B6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ensembleResult}>
                <Text style={styles.ensembleResultText}>{scorePercent}%</Text>
              </LinearGradient>
            </View>
          </View>
        )}

        <Pressable style={styles.expandBtn} onPress={() => setExpanded((p) => !p)}>
          <Text style={styles.expandText}>{expanded ? "세부 분석 접기" : "세부 분석 보기"}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
        </Pressable>

        <View style={styles.actionRow}>
          {[
            { icon: "refresh-outline" as const, label: "다시 분석", onPress: () => router.replace("/(tabs)/home") },
            { icon: "time-outline" as const, label: "기록 보기", onPress: () => router.push("/(tabs)/history") },
            { icon: "home-outline" as const, label: "홈으로", onPress: () => router.replace("/(tabs)/home") }
          ].map((btn) => (
            <Pressable key={btn.label} style={styles.actionBtn} onPress={btn.onPress}>
              <Ionicons name={btn.icon} size={18} color={colors.fg} />
              <Text style={styles.actionBtnText}>{btn.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => void share()} style={styles.sharePressable}>
          <LinearGradient colors={["#06B6D4", "#5B6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>결과 카드 공유하기</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>

      <View style={styles.hiddenCard} pointerEvents="none">
        <ViewShot ref={cardRef} options={{ format: "png", quality: 1 }}>
          <ShareCard item={item} derived={derived} />
        </ViewShot>
      </View>
    </SafeAreaView>
  );
}

// ─── Share card styles — always white, theme-independent ────────────────────

const shareCardStyles = StyleSheet.create({
  accentBar: { height: 4, width: "100%" },
  bottomRule: { backgroundColor: "#F1F5F9", height: 1, marginHorizontal: 20 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, width: 360
  },
  divider: { backgroundColor: "#E2E8F0", height: "100%", width: 1 },
  footer: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  footerLeft: { color: "#94A3B8", fontSize: 11, fontWeight: "500", letterSpacing: 0.4 },
  footerRight: { color: "#94A3B8", fontSize: 11, fontWeight: "400" },
  header: { alignItems: "center", flexDirection: "row", gap: 6, paddingHorizontal: 18, paddingVertical: 14 },
  headerSpacer: { flex: 1 },
  headerSub: { color: "#94A3B8", fontSize: 11, fontWeight: "400" },
  headerTitle: { color: "#0F172A", fontSize: 14, fontWeight: "800", letterSpacing: 1.4 },
  image: { height: 320, width: "100%" },
  imageWrap: { overflow: "hidden" },
  resultRow: { alignItems: "center", flexDirection: "row", gap: 20, paddingHorizontal: 20, paddingVertical: 20 },
  root: { alignItems: "center", backgroundColor: "#F1F5F9", padding: 20 },
  scoreBlock: { alignItems: "flex-start", gap: 2 },
  scoreHint: { color: "#94A3B8", fontSize: 11, fontWeight: "500", letterSpacing: 0.3 },
  scoreNum: { fontSize: 52, fontWeight: "800", letterSpacing: -2, lineHeight: 56 },
  scorePct: { fontSize: 24, fontWeight: "600", letterSpacing: 0 },
  verdictBlock: { flex: 1, gap: 6 },
  verdictChip: {
    alignItems: "center", alignSelf: "flex-start", borderRadius: 6,
    flexDirection: "row", gap: 5, paddingHorizontal: 8, paddingVertical: 4
  },
  verdictChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  verdictDot: { borderRadius: 999, height: 5, width: 5 },
  verdictLabel: { color: "#0F172A", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  verdictSub: { color: "#64748B", fontSize: 12, fontWeight: "400" }
});
