import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { makeImageName, resizeForAnalysis } from "@/lib/image";
import { useHistory } from "@/hooks/useHistory";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { HistoryItem } from "@/lib/types";

function verdictTitle(item: HistoryItem) {
  const pct = Math.round(item.score * 100);
  return item.verdict === "AI" ? `${pct}% · AI 생성 가능성 높음` : `${100 - pct}% · 실사 가능성 높음`;
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
    container: { padding: 20, paddingBottom: 120 },
    empty: {
      backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, padding: 14
    },
    emptyText: { color: c.muted, fontSize: 12, lineHeight: 18, fontWeight: "500" },
    iconBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 36, justifyContent: "center", width: 36
    },
    recentInfo: { flex: 1, minWidth: 0 },
    recentList: { gap: 10 },
    recentName: { color: c.fg, fontSize: 12, fontWeight: "600", lineHeight: 16 },
    recentRow: {
      alignItems: "center", backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, flexDirection: "row",
      gap: 12, overflow: "hidden", padding: 12
    },
    recentScore: { fontSize: 11, fontWeight: "500", marginTop: 4 },
    recentThumb: {
      backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 54, width: 54
    },
    safe: { backgroundColor: c.bg, flex: 1 },
    sectionHeader: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      marginBottom: 10, marginTop: 22
    },
    sectionTitle: { color: c.fg, fontSize: 14, fontWeight: "600" },
    seeAll: { alignItems: "center", flexDirection: "row", gap: 4 },
    seeAllText: { color: c.muted, fontSize: 12, fontWeight: "500" },
    title: {
      color: c.fg, fontSize: 26, fontWeight: "700",
      letterSpacing: -0.8, lineHeight: 32, marginBottom: 18, marginTop: 8
    },
    titleAccent: { color: c.primary },
    uploadBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row",
      gap: 6, justifyContent: "center", paddingVertical: 11
    },
    uploadBtnText: { color: c.fg, fontSize: 13, fontWeight: "600" },
    uploadButtons: { flexDirection: "row", gap: 8, marginTop: 6, width: "100%" },
    uploadCard: {
      alignItems: "center", borderColor: c.borderStrong, borderRadius: 20,
      borderStyle: "dashed", borderWidth: 1.5, gap: 10, padding: 22
    },
    uploadIconBox: { alignItems: "center", borderRadius: 18, height: 58, justifyContent: "center", width: 58 },
    uploadText: { color: c.fg, fontSize: 14, fontWeight: "600", lineHeight: 20, textAlign: "center" }
  });
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { items } = useHistory();
  const recent = useMemo(() => items.slice(0, 3), [items]);

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

        <View style={styles.uploadCard}>
          <LinearGradient
            colors={["#06B6D4", "#5B6BFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.uploadIconBox}
          >
            <Ionicons name="cloud-upload-outline" size={26} color="#fff" />
          </LinearGradient>
          <Text style={styles.uploadText}>
            이미지를 선택하거나, 촬영하거나,{"\n"}공유받으세요
          </Text>
          <View style={styles.uploadButtons}>
            <Pressable style={styles.uploadBtn} onPress={() => router.push("/camera")}>
              <Ionicons name="camera-outline" size={16} color={colors.fg} />
              <Text style={styles.uploadBtnText}>촬영</Text>
            </Pressable>
            <Pressable style={styles.uploadBtn} onPress={() => void pickFromGallery()}>
              <Ionicons name="image-outline" size={16} color={colors.fg} />
              <Text style={styles.uploadBtnText}>갤러리</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 분석</Text>
          <Pressable onPress={() => router.push("/(tabs)/history")} style={styles.seeAll}>
            <Text style={styles.seeAllText}>전체 보기</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.muted} />
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 기록이 없습니다. 예시 이미지나 파일을 선택해서 첫 분석을 시작해보세요.</Text>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recent.map((item) => {
              const statusColor = item.verdict === "AI" ? colors.ai : colors.real;
              return (
                <Pressable
                  key={item.id}
                  style={styles.recentRow}
                  onPress={() => router.push({ pathname: "/result", params: { historyId: item.id } })}
                >
                  <Image source={{ uri: item.imageUri }} style={styles.recentThumb} contentFit="cover" />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentName} numberOfLines={1}>{item.imageName}</Text>
                    <Text style={[styles.recentScore, { color: statusColor }]}>{verdictTitle(item)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
