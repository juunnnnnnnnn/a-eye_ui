import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { SwipeTabs } from "@/components/SwipeTabs";
import { makeImageName, resizeForAnalysis } from "@/lib/image";
import { useHistory } from "@/hooks/useHistory";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
    container: { padding: 20, paddingBottom: 120 },
    empty: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 18, borderWidth: 1, gap: 12, paddingHorizontal: 18, paddingVertical: 28
    },
    emptyIcon: {
      alignItems: "center", backgroundColor: c.surface2, borderRadius: 999,
      height: 48, justifyContent: "center", width: 48
    },
    emptyText: { color: c.muted, fontSize: 13, fontWeight: "500", lineHeight: 19, textAlign: "center" },
    iconBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 36, justifyContent: "center", width: 36
    },
    // ── 히어로 카드 ──
    heroCard: {
      borderRadius: 24, overflow: "hidden", padding: 20,
      shadowColor: "#5B6BFF", shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.32, shadowRadius: 20
    },
    heroGlow: {
      position: "absolute", right: -40, top: -50, width: 160, height: 160,
      borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)"
    },
    heroTop: { alignItems: "center", flexDirection: "row", gap: 14 },
    heroGlyph: {
      alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 16,
      height: 52, justifyContent: "center", width: 52
    },
    heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
    heroSub: { color: "rgba(255,255,255,0.86)", fontSize: 13, fontWeight: "500", marginTop: 3 },
    heroButtons: { flexDirection: "row", gap: 10, marginTop: 18 },
    heroBtn: {
      alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14,
      flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", paddingVertical: 13
    },
    heroBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    // ── 통계 ──
    statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
    statChip: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 16, borderWidth: 1, flex: 1, paddingVertical: 14
    },
    statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
    statLabel: { color: c.muted, fontSize: 11, fontWeight: "600", marginTop: 3 },
    // ── 최근 분석 ──
    recentInfo: { flex: 1, minWidth: 0 },
    recentList: { gap: 10 },
    recentMeta: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 7 },
    recentName: { color: c.fg, fontSize: 13, fontWeight: "700", lineHeight: 17 },
    recentPct: { fontSize: 13, fontWeight: "800" },
    recentRow: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 18, borderWidth: 1, flexDirection: "row",
      gap: 12, overflow: "hidden", padding: 12
    },
    recentThumb: {
      backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, height: 56, width: 56
    },
    pillDot: { borderRadius: 999, height: 6, width: 6 },
    pillText: { fontSize: 11, fontWeight: "700" },
    verdictPill: {
      alignItems: "center", borderRadius: 999, flexDirection: "row",
      gap: 5, paddingHorizontal: 9, paddingVertical: 4
    },
    safe: { backgroundColor: c.bg, flex: 1 },
    sectionHeader: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      marginBottom: 12, marginTop: 26
    },
    sectionTitle: { color: c.fg, fontSize: 15, fontWeight: "700" },
    seeAll: { alignItems: "center", flexDirection: "row", gap: 4 },
    seeAllText: { color: c.muted, fontSize: 12, fontWeight: "500" },
    title: {
      color: c.fg, fontSize: 26, fontWeight: "800",
      letterSpacing: -0.8, lineHeight: 32, marginBottom: 18, marginTop: 8
    },
    titleAccent: { color: c.primary }
  });
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { items } = useHistory();
  const recent = useMemo(() => items.slice(0, 3), [items]);
  const stats = useMemo(() => {
    const total = items.length;
    const ai = items.filter((i) => i.verdict === "AI").length;
    return { total, ai, real: total - ai };
  }, [items]);

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("권한 필요", "이미지 분석을 위해 사진 라이브러리 접근 권한이 필요합니다.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
        mediaTypes: ["images"],
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
        quality: 1
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let imageUri = asset.uri;
        try {
          imageUri = await resizeForAnalysis(asset.uri);
        } catch (resizeError) {
          console.warn("선택한 이미지 리사이즈 실패, 원본으로 분석합니다.", resizeError);
        }
        router.push({ pathname: "/loading", params: { imageUri, imageName: asset.fileName || makeImageName("gallery") } });
      }
    } catch (error) {
      console.warn("사진 선택 실패", error);
      Alert.alert(
        "이미지 읽기 실패",
        "사진 앱에서 원본을 내려받는 중이거나 iOS가 이 파일을 바로 읽지 못했습니다. 사진을 한 번 열어 원본 다운로드를 끝낸 뒤 다시 선택해 주세요."
      );
    }
  };

  return (
    <SwipeTabs index={0}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <Wordmark navigable={false} />
        <View style={styles.appBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/history")}>
            <Ionicons name="time-outline" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          진짜와 가짜를{" "}
          <Text style={styles.titleAccent}>가려내볼까요?</Text>
        </Text>

        {/* 분석 시작 히어로 카드 */}
        <View style={styles.heroCard}>
          <LinearGradient colors={["#06B6D4", "#5B6BFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View style={styles.heroGlyph}>
              <Ionicons name="sparkles" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>이미지 분석 시작</Text>
              <Text style={styles.heroSub}>촬영하거나 갤러리에서 골라보세요</Text>
            </View>
          </View>
          <View style={styles.heroButtons}>
            <Pressable style={styles.heroBtn} onPress={() => router.push("/camera")}>
              <Ionicons name="camera" size={17} color="#fff" />
              <Text style={styles.heroBtnText}>촬영</Text>
            </Pressable>
            <Pressable style={styles.heroBtn} onPress={() => void pickFromGallery()}>
              <Ionicons name="images" size={16} color="#fff" />
              <Text style={styles.heroBtnText}>갤러리</Text>
            </Pressable>
          </View>
        </View>

        {/* 분석 통계 */}
        {stats.total > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: colors.fg }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>총 분석</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: colors.ai }]}>{stats.ai}</Text>
              <Text style={styles.statLabel}>AI 생성</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: colors.real }]}>{stats.real}</Text>
              <Text style={styles.statLabel}>실사</Text>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 분석</Text>
          {recent.length > 0 && (
            <Pressable onPress={() => router.push("/(tabs)/history")} style={styles.seeAll}>
              <Text style={styles.seeAllText}>전체 보기</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {recent.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="image-outline" size={22} color={colors.muted} />
            </View>
            <Text style={styles.emptyText}>아직 분석 기록이 없어요.{"\n"}위에서 첫 이미지를 분석해보세요.</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recent.map((item) => {
              const isAi = item.verdict === "AI";
              const statusColor = isAi ? colors.ai : colors.real;
              const statusSoft = isAi ? colors.aiSoft : colors.realSoft;
              const pct = isAi ? Math.round(item.score * 100) : Math.round((1 - item.score) * 100);
              return (
                <Pressable
                  key={item.id}
                  style={styles.recentRow}
                  onPress={() => router.push({ pathname: "/result", params: { historyId: item.id } })}
                >
                  <Image source={{ uri: item.imageUri }} style={styles.recentThumb} contentFit="cover" />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentName} numberOfLines={1}>{item.imageName}</Text>
                    <View style={styles.recentMeta}>
                      <View style={[styles.verdictPill, { backgroundColor: statusSoft }]}>
                        <View style={[styles.pillDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.pillText, { color: statusColor }]}>{isAi ? "AI 생성" : "실사"}</Text>
                      </View>
                      <Text style={[styles.recentPct, { color: statusColor }]}>{pct}%</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </SwipeTabs>
  );
}
