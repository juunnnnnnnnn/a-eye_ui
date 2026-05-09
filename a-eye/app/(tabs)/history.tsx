import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { useHistory } from "@/hooks/useHistory";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { HistoryItem } from "@/lib/types";

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return `오늘 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diffDays === 1) return "어제";
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(d);
}

function verdictTitle(item: HistoryItem) {
  return item.verdict === "AI" ? "AI 생성 가능성 높음" : "실사 가능성 높음";
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
    cell: {
      backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, flex: 1, overflow: "hidden"
    },
    cellDate: { color: c.muted, fontSize: 10, marginTop: 3 },
    cellImage: { aspectRatio: 1, width: "100%" },
    cellInfo: { padding: 8 },
    cellLabel: { fontSize: 11, fontWeight: "600", lineHeight: 15 },
    chip: {
      borderColor: c.border, borderRadius: 999, borderWidth: 1,
      flexShrink: 0, paddingHorizontal: 12, paddingVertical: 6
    },
    chipActive: {
      alignItems: "center", borderRadius: 999, flexDirection: "row",
      flexShrink: 0, gap: 6, overflow: "hidden",
      paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.primary
    },
    chipActiveText: { color: "#fff", fontSize: 12, fontWeight: "600" },
    chipCount: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "500" },
    chipText: { color: c.muted, fontSize: 12, fontWeight: "600" },
    chips: { flexDirection: "row", gap: 6, marginBottom: 14 },
    container: { flex: 1, paddingHorizontal: 20 },
    empty: { padding: 18 },
    emptyText: { color: c.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
    iconBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 36, justifyContent: "center", width: 36
    },
    imageWrap: { position: "relative" },
    list: { gap: 12, paddingBottom: 120 },
    row: { gap: 12 },
    safe: { backgroundColor: c.bg, flex: 1 },
    scoreBadge: {
      backgroundColor: "rgba(15,23,42,0.78)", borderRadius: 999,
      paddingHorizontal: 8, paddingVertical: 3,
      position: "absolute", right: 8, top: 8
    },
    scoreText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    statusDot: {
      borderRadius: 999, bottom: 8, height: 8, left: 8,
      position: "absolute", shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7, shadowRadius: 4, width: 8
    },
    title: {
      color: c.fg, fontSize: 24, fontWeight: "700",
      letterSpacing: -0.8, marginBottom: 14
    }
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
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{pct}%</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: color, shadowColor: color }]} />
      </View>
      <View style={styles.cellInfo}>
        <Text style={[styles.cellLabel, { color }]}>{verdictTitle(item)}</Text>
        <Text style={styles.cellDate}>{formatWhen(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { items } = useHistory();

  return (
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

        <View style={styles.chips}>
          <View style={styles.chipActive}>
            <Text style={styles.chipActiveText}>전체</Text>
            {items.length > 0 && <Text style={styles.chipCount}>{items.length}</Text>}
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>자동 저장</Text>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                아직 저장된 분석 기록이 없습니다.{"\n"}홈에서 이미지를 분석해보세요.
              </Text>
            </View>
          }
          renderItem={({ item }) => <GridItem item={item} styles={styles} colors={colors} />}
        />
      </View>
    </SafeAreaView>
  );
}
