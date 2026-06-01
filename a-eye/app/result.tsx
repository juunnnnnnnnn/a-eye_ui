import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import * as Sharing from "expo-sharing";
import ViewShot from "react-native-view-shot";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Wordmark } from "@/components/Wordmark";
import { Logo } from "@/components/Logo";
import { ImageToggle } from "@/components/ImageToggle";
import { FallbackError } from "@/components/FallbackError";
import { APP_SHARE_URL } from "@/constants/config";
import { normalizeAnalyzeResponse } from "@/lib/api";
import { loadHistory, safeGetString, STORAGE_KEYS } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { BackendAnalyzeResponse, HistoryItem } from "@/lib/types";

type ResultParams = { analysisId?: string; historyId?: string };

function readParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function pct(v: number) {
  return Math.round(Math.max(0, Math.min(1, v)) * 100);
}

type AxisKey = "structure" | "context" | "detail";

const AXIS_META: Record<AxisKey, { label: string; desc: string }> = {
  structure: { label: "구조 분석", desc: "전역 형태·구성의 일관성" },
  context: { label: "맥락 검증", desc: "장면 의미의 일관성" },
  detail: { label: "디테일 판독", desc: "질감·주파수·노이즈 흔적" }
};

// 모델이 반환한 실제 관점별 AI 확률(0~1)을 백분율로 변환. 값이 없으면 null.
function getRealSubScores(item: HistoryItem) {
  const { structure_score, context_score, detail_score } = item;
  if (structure_score == null || context_score == null || detail_score == null) {
    return null;
  }
  return {
    structure: pct(structure_score),
    context: pct(context_score),
    detail: pct(detail_score)
  };
}

// 실제 세부 점수에서 사실 기반의 판별 근거 문장을 생성합니다(임의 텍스트 아님).
function buildEvidence(
  isAi: boolean,
  scorePercent: number,
  sub: { structure: number; context: number; detail: number } | null
): string[] {
  const lines: string[] = [];
  if (sub) {
    const axes = (Object.keys(AXIS_META) as AxisKey[]).map((k) => ({ ...AXIS_META[k], value: sub[k] }));
    const top = isAi
      ? axes.reduce((a, b) => (b.value > a.value ? b : a))
      : axes.reduce((a, b) => (b.value < a.value ? b : a));
    lines.push(
      isAi
        ? `${top.label}에서 AI 생성 신호가 가장 강했습니다 (${top.value}%).`
        : `${top.label}에서 자연스러운 특성이 가장 뚜렷했습니다 (AI 가능성 ${top.value}%).`
    );
  }
  lines.push(
    isAi
      ? `종합 AI 생성 확률은 ${scorePercent}%입니다.`
      : `종합 실제 사진 확률은 ${100 - scorePercent}%입니다.`
  );
  lines.push("표시된 수치는 모델의 통계적 추정치이며 진위를 확정하지 않습니다.");
  return lines;
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

function CircularScore({
  value, color, track, size = 88, stroke = 9
}: { value: number; color: string; track: string; size?: number; stroke?: number }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (circ * Math.max(0, Math.min(100, value))) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </Svg>
      <Text style={{ fontSize: 26, fontWeight: "800", color, letterSpacing: -1 }}>
        {value}
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.muted }}>%</Text>
      </Text>
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
    if (
      typeof item.id === "string" && typeof item.imageUri === "string" &&
      typeof item.imageName === "string" && typeof item.createdAt === "string"
    ) {
      return {
        ...normalizeAnalyzeResponse(item as BackendAnalyzeResponse),
        id: item.id,
        imageUri: item.imageUri,
        imageName: item.imageName,
        createdAt: item.createdAt
      };
    }
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
        <View style={shareCardStyles.ctaRow}>
          <View style={shareCardStyles.ctaTextWrap}>
            <Text style={shareCardStyles.ctaTitle}>이 이미지, 진짜일까?</Text>
            <Text style={shareCardStyles.ctaSub}>QR을 스캔해 A-EYE에서{"\n"}직접 분석해보세요</Text>
          </View>
          <View style={shareCardStyles.qrWrap}>
            <QRCode value={APP_SHARE_URL} size={56} color="#0F172A" backgroundColor="#FFFFFF" />
          </View>
        </View>
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
    const confidence = Math.abs(item.score - 0.5) * 2;
    const confLabel = confidence >= 0.6 ? "높음" : confidence >= 0.3 ? "보통" : "낮음";
    const pillLabel = isAi ? `AI 생성 · 확신도 ${confLabel}` : `실사 · 확신도 ${confLabel}`;
    const sub = getRealSubScores(item);
    const evidence = buildEvidence(isAi, scorePercent, sub);
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
      backgroundColor: c.surface, borderColor: c.border, borderRadius: 18,
      borderWidth: 1, gap: 14, marginTop: 16, padding: 16,
      shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10
    },
    detailHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    detailNote: { color: c.muted, fontSize: 10, lineHeight: 15, marginTop: 2 },
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
      backgroundColor: c.surface, borderColor: c.border, borderRadius: 18,
      borderWidth: 1, gap: 11, marginTop: 12, padding: 16,
      shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10
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
    verdictCard: {
      borderRadius: 22, borderWidth: 1, marginBottom: 12,
      shadowColor: "#5B6BFF", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14
    },
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
  const [item, setItem] = useState<HistoryItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(true);
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
        const analysisId = readParam(params.analysisId);
        if (analysisId && next?.id !== analysisId) {
          next = null;
        }
      }
      if (!mounted) return;
      setItem(next);
      setLoaded(true);
    }
    void load();
    return () => { mounted = false; };
  }, [params.analysisId, params.historyId]);

  const derived = useResultDerived(item);

  // 결과 카드 이미지 + 앱 링크를 함께 공유합니다.
  const share = async () => {
    if (!item || !derived) return;
    const message = `이 이미지, AI가 만들었을까? A-EYE로 직접 확인해보세요.\n${APP_SHARE_URL}`;
    try {
      const uri = await cardRef.current?.capture?.();
      if (!uri) throw new Error("capture failed");
      if (Platform.OS === "ios") {
        // iOS: 카드 이미지 + 링크 텍스트를 한 번에 공유
        await Share.share({ url: uri, message });
      } else {
        // Android: 이미지(카드에 QR/링크 포함) 공유. 링크는 카드의 QR 코드로 전달됩니다.
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { dialogTitle: "A-EYE 분석 결과 공유", mimeType: "image/png" });
        } else {
          await Share.share({ message });
        }
      }
    } catch {
      Alert.alert("공유 실패", "공유 중 오류가 발생했습니다.");
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
            <CircularScore value={displayScore} color={statusColor} track={colors.surface2} />
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
            <Text style={[styles.xaiBadge, { color: isAi ? "#EF4444" : "#F59E0B" }]}>AI {scorePercent}%</Text>
          </View>
          <ImageToggle originalUri={item.imageUri} heatmapB64={item.heatmap_b64} overlayB64={item.overlay_b64} />
        </View>

        {expanded && (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.cardLabel}>모델별 점수</Text>
            </View>
            {sub ? (
              <>
                <View style={{ gap: 14 }}>
                  <ScoreBar label="구조 분석" value={sub.structure} sub="전역 형태·구성의 일관성" />
                  <ScoreBar label="맥락 검증" value={sub.context} sub="장면 의미의 일관성" />
                  <ScoreBar label="디테일 판독" value={sub.detail} sub="질감·주파수·노이즈 흔적" />
                </View>
                <View style={styles.ensembleRow}>
                  {["구조", "맥락", "디테일"].map((label) => (
                    <View key={label} style={styles.ensembleChip}>
                      <Text style={styles.ensembleLabel}>{label}</Text>
                    </View>
                  ))}
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                  <LinearGradient colors={["#06B6D4", "#5B6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ensembleResult}>
                    <Text style={styles.ensembleResultText}>{scorePercent}%</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.detailNote}>각 점수는 해당 관점 모델이 산출한 AI 확률입니다.</Text>
              </>
            ) : (
              <Text style={styles.detailNote}>이 기록에는 세부 점수가 저장되어 있지 않습니다.</Text>
            )}
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
  ctaRow: {
    alignItems: "center", flexDirection: "row", gap: 12,
    justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  ctaSub: { color: "#64748B", fontSize: 12, fontWeight: "500", marginTop: 3 },
  qrWrap: {
    backgroundColor: "#FFFFFF", borderColor: "#E2E8F0", borderRadius: 12,
    borderWidth: 1, padding: 7
  },
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
