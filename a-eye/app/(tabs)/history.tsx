import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { SwipeTabs } from "@/components/SwipeTabs";
import { useHistory } from "@/hooks/useHistory";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { HistoryItem, Verdict } from "@/lib/types";

type FilterKey = "all" | "AI" | "REAL";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `오늘 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diffDays === 1) return "어제";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(d);
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
    cell: {
      backgroundColor: c.surface, borderColor: c.border, borderRadius: 18, borderWidth: 1,
      flex: 1, overflow: "hidden",
      shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10
    },
    cellDate: { color: c.muted, fontSize: 10, fontWeight: "500" },
    cellImage: { aspectRatio: 1, width: "100%" },
    cellInfo: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 10 },
    chip: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderRadius: 999,
      borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 8
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipCount: { color: c.muted, fontSize: 11, fontWeight: "700" },
    chipCountActive: { color: "rgba(255,255,255,0.85)" },
    chipText: { color: c.muted, fontSize: 12, fontWeight: "700" },
    chipTextActive: { color: "#fff" },
    chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
    container: { flex: 1, paddingHorizontal: 20 },
    empty: { alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 60 },
    emptyIcon: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border, borderRadius: 999,
      borderWidth: 1, height: 64, justifyContent: "center", width: 64
    },
    emptyText: { color: c.muted, fontSize: 13, fontWeight: "500", lineHeight: 20, textAlign: "center" },
    iconBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 36, justifyContent: "center", width: 36
    },
    imageWrap: { position: "relative" },
    list: { gap: 12, paddingBottom: 120 },
    pillDot: { borderRadius: 999, height: 6, width: 6 },
    row: { gap: 12 },
    safe: { backgroundColor: c.bg, flex: 1 },
    scoreBadge: {
      alignItems: "center", backgroundColor: "rgba(15,23,42,0.72)", borderRadius: 999,
      flexDirection: "row", gap: 4, paddingHorizontal: 9, paddingVertical: 4,
      position: "absolute", right: 8, top: 8
    },
    scoreText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    subtitle: { color: c.muted, fontSize: 13, fontWeight: "500", marginBottom: 16, marginTop: 2 },
    title: { color: c.fg, fontSize: 26, fontWeight: "800", letterSpacing: -0.8 },
    verdictPill: { alignItems: "center", flexDirection: "row", gap: 5 },
    verdictText: { fontSize: 11, fontWeight: "700" }
  });
}

function GridItem({ item, styles, colors }: { item: HistoryItem; styles: ReturnType<typeof makeStyles>; colors: ColorTokens }) {
  const isAi = item.verdict === "AI";
  const color = isAi ? colors.ai : colors.real;
  const pct = isAi ? Math.round(item.score * 100) : Math.round((1 - item.score) * 100);

  return (
    <Pressable
      style={styles.cell}
      onPress={() => router.push({ pathname: "/result", params: { historyId: item.id } })}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.imageUri }} style={styles.cellImage} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.28)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.scoreBadge}>
          <View style={[styles.pillDot, { backgroundColor: color }]} />
          <Text style={styles.scoreText}>{pct}%</Text>
        </View>
      </View>
      <View style={styles.cellInfo}>
        <View style={styles.verdictPill}>
          <View style={[styles.pillDot, { backgroundColor: color }]} />
          <Text style={[styles.verdictText, { color }]}>{isAi ? "AI 생성" : "실사"}</Text>
        </View>
        <Text style={styles.cellDate}>{formatWhen(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { items } = useHistory();
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(() => {
    const ai = items.filter((i) => i.verdict === "AI").length;
    return { all: items.length, AI: ai, REAL: items.length - ai };
  }, [items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.verdict === (filter as Verdict))),
    [items, filter]
  );

  const chips: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "전체" },
    { key: "AI", label: "AI 생성" },
    { key: "REAL", label: "실사" }
  ];

  return (
    <SwipeTabs index={1}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <Wordmark />
        <View style={styles.appBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/settings")}>
            <Ionicons name="settings-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>분석 기록</Text>
        <Text style={styles.subtitle}>
          {items.length > 0 ? `지금까지 ${items.length}건을 분석했어요` : "분석 기록이 여기에 모여요"}
        </Text>

        <View style={styles.chips}>
          {chips.map(({ key, label }) => {
            const active = filter === key;
            return (
              <Pressable key={key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(key)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                <Text style={[styles.chipCount, active && styles.chipCountActive]}>{counts[key]}</Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="albums-outline" size={26} color={colors.muted} />
              </View>
              <Text style={styles.emptyText}>
                {filter === "all"
                  ? "아직 저장된 분석 기록이 없어요.\n홈에서 이미지를 분석해보세요."
                  : "해당하는 기록이 없어요."}
              </Text>
            </View>
          }
          renderItem={({ item }) => <GridItem item={item} styles={styles} colors={colors} />}
        />
      </View>
    </SafeAreaView>
    </SwipeTabs>
  );
}
