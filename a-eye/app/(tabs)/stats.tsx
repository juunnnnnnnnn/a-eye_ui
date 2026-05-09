import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { useHistory } from "@/hooks/useHistory";

type PieDatum = {
  value: number;
  color: string;
  text: string;
};

type BarDatum = {
  value: number;
  label: string;
  frontColor: string;
};

export default function StatsScreen() {
  const { items } = useHistory();
  const aiCount = items.filter((item) => item.verdict === "AI").length;
  const realCount = items.filter((item) => item.verdict === "REAL").length;
  const average = items.length ? items.reduce((sum, item) => sum + item.score, 0) / items.length : 0;
  const pieData: PieDatum[] = [
    { value: aiCount, color: colors.ai, text: "AI" },
    { value: realCount, color: colors.real, text: "실제" }
  ].filter((item) => item.value > 0);
  const barData = useMemo<BarDatum[]>(() => buildSevenDayBars(items), [items]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>통계</Text>
        <View style={styles.summaryGrid}>
          <StatCard label="총 분석 수" value={`${items.length}`} />
          <StatCard label="평균 AI 점수" value={`${Math.round(average * 100)}%`} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI / 실제 비율</Text>
          {pieData.length ? (
            <PieChart data={pieData} donut radius={92} innerRadius={58} textColor={colors.white} textSize={12} />
          ) : (
            <Text style={styles.empty}>분석 기록이 쌓이면 차트가 표시됩니다.</Text>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 7일 분석 수</Text>
          <BarChart
            data={barData}
            barWidth={24}
            height={180}
            hideRules
            noOfSections={4}
            spacing={18}
            xAxisLabelTextStyle={styles.axisLabel}
            yAxisTextStyle={styles.axisLabel}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function buildSevenDayBars(items: Array<{ createdAt: string }>): BarDatum[] {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    const count = items.filter((item) => {
      const itemDate = new Date(item.createdAt);
      return itemDate.toDateString() === date.toDateString();
    }).length;
    return { value: count, label, frontColor: colors.primary };
  });
}

const styles = StyleSheet.create({
  axisLabel: {
    color: colors.muted,
    fontSize: 10
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    padding: 18
  },
  cardTitle: {
    alignSelf: "flex-start",
    color: colors.fg,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 16
  },
  container: {
    padding: 20,
    paddingBottom: 120
  },
  empty: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 24,
    textAlign: "center"
  },
  safe: {
    backgroundColor: colors.bg,
    flex: 1
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 18
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  statValue: {
    color: colors.fg,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 8
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18
  },
  title: {
    color: colors.fg,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8
  }
});
