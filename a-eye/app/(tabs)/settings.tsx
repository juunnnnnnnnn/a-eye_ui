import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { checkHealth, getVersion } from "@/lib/api";
import { useBackendUrl } from "@/hooks/useBackendUrl";
import { useHistory } from "@/hooks/useHistory";
import { safeRemoveItem } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ThemeMode } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";

const ONBOARDING_KEY = "aeye.onboardingDone";

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
    connOk: { color: c.real },
    connStatus: { color: c.muted, fontSize: 12, fontWeight: "500", marginTop: 4 },
    container: { padding: 20, paddingBottom: 120 },
    footer: { alignItems: "center", marginTop: 20 },
    footerTitle: { color: c.muted, fontSize: 11, fontWeight: "400" },
    footerVersion: { color: c.muted, fontSize: 10, fontWeight: "500", letterSpacing: 1, marginTop: 4, opacity: 0.7 },
    iconBtn: {
      alignItems: "center", backgroundColor: c.surface2, borderColor: c.border,
      borderRadius: 12, borderWidth: 1, height: 36, justifyContent: "center", width: 36
    },
    knobOff: { left: 2 },
    knobOn: { left: 18 },
    onLabel: { color: c.fg, fontSize: 11, fontWeight: "600" },
    row: {
      alignItems: "center", flexDirection: "row", gap: 12,
      paddingHorizontal: 14, paddingVertical: 13
    },
    rowBorder: { borderBottomColor: c.border, borderBottomWidth: 1 },
    rowLabel: { color: c.fg, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    rowSub: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
    rowText: { flex: 1 },
    safe: { backgroundColor: c.bg, flex: 1 },
    sectionCard: {
      backgroundColor: c.surface, borderColor: c.border,
      borderRadius: 14, borderWidth: 1, marginBottom: 18, overflow: "hidden"
    },
    sectionLabel: {
      color: c.muted, fontSize: 10, fontWeight: "600", letterSpacing: 1.2,
      marginBottom: 8, marginLeft: 4, textTransform: "uppercase"
    },
    testBtn: {
      backgroundColor: c.primary, borderRadius: 12,
      marginTop: 8, paddingVertical: 11, alignItems: "center"
    },
    testBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    themeBtnActive: {
      backgroundColor: "rgba(91,107,255,0.12)",
      borderColor: c.primary, borderWidth: 1.5
    },
    themeBtn: {
      alignItems: "center", borderColor: "transparent", borderRadius: 12,
      borderWidth: 1.5, flex: 1, gap: 6, paddingVertical: 12
    },
    themeBtnLabel: { color: c.muted, fontSize: 12, fontWeight: "500" },
    themeBtnLabelActive: { color: c.primary, fontWeight: "700" },
    themeRow: { flexDirection: "row", gap: 8, padding: 10 },
    title: {
      color: c.fg, fontSize: 24, fontWeight: "700",
      letterSpacing: -0.8, marginBottom: 18
    },
    toggle: { borderRadius: 999, height: 24, position: "relative", width: 40 },
    toggleKnob: {
      backgroundColor: "#fff", borderRadius: 999, height: 20,
      position: "absolute", shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2,
      shadowRadius: 2, top: 2, width: 20
    },
    toggleOff: { backgroundColor: c.surface2, borderColor: c.border, borderWidth: 1 },
    toggleOn: { backgroundColor: c.primary },
    urlInput: {
      backgroundColor: c.surface2, borderColor: c.border, borderRadius: 12,
      borderWidth: 1, color: c.fg, fontSize: 13, fontWeight: "600",
      marginTop: 8, paddingHorizontal: 14, paddingVertical: 12
    },
    urlLabel: { color: c.fg, fontSize: 13, fontWeight: "600" },
    urlSection: { gap: 0, padding: 14 }
  });
}

function SectionLabel({ label, style }: { label: string; style: ReturnType<typeof makeStyles> }) {
  return <Text style={style.sectionLabel}>{label}</Text>;
}

function SectionCard({ children, style }: { children: React.ReactNode; style: ReturnType<typeof makeStyles> }) {
  return <View style={style.sectionCard}>{children}</View>;
}

function SettingsRow({
  label, sub, trailing, destructive, isLast, style, colors
}: {
  label: string; sub?: string; trailing?: React.ReactNode;
  destructive?: boolean; isLast?: boolean;
  style: ReturnType<typeof makeStyles>; colors: ColorTokens;
}) {
  return (
    <View style={[style.row, !isLast && style.rowBorder]}>
      <View style={style.rowText}>
        <Text style={[style.rowLabel, destructive && { color: colors.ai }]}>{label}</Text>
        {sub ? <Text style={style.rowSub}>{sub}</Text> : null}
      </View>
      <View>{trailing}</View>
    </View>
  );
}

function Toggle({ on, onToggle, style }: { on: boolean; onToggle: () => void; style: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable onPress={onToggle} style={[style.toggle, on ? style.toggleOn : style.toggleOff]}>
      <View style={[style.toggleKnob, on ? style.knobOn : style.knobOff]} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { backendUrl, setBackendUrl } = useBackendUrl();
  const { deleteAll } = useHistory();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [connection, setConnection] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const [includeOriginal, setIncludeOriginal] = useState(false);

  useEffect(() => { setUrlInput(backendUrl); }, [backendUrl]);

  const testConnection = async () => {
    try {
      await setBackendUrl(urlInput);
      await checkHealth(urlInput);
      const v = await getVersion(urlInput);
      setConnection(`연결 정상 · ${v.model_version}`);
    } catch {
      setConnection("연결 실패");
    }
  };

  const clearAll = () => {
    Alert.alert("기록 전체 삭제", "저장된 분석 기록을 모두 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => void deleteAll() }
    ]);
  };

  const resetOnboarding = async () => {
    await safeRemoveItem(ONBOARDING_KEY);
    router.replace("/onboarding");
  };

  const themes: Array<{ key: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
    { key: "light", icon: "sunny-outline", label: "라이트" },
    { key: "dark", icon: "moon-outline", label: "다크" },
    { key: "system", icon: "desktop-outline", label: "시스템" }
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <Wordmark />
        <View style={styles.appBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/history")}>
            <Ionicons name="time-outline" size={16} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>설정</Text>

        {/* Theme */}
        <SectionLabel label="테마" style={styles} />
        <SectionCard style={styles}>
          <View style={styles.themeRow}>
            {themes.map(({ key, icon, label }) => {
              const active = mode === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.themeBtn, active && styles.themeBtnActive]}
                  onPress={() => setMode(key)}
                >
                  <Ionicons name={icon} size={18} color={active ? colors.primary : colors.muted} />
                  <Text style={[styles.themeBtnLabel, active && styles.themeBtnLabelActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* Analysis */}
        <SectionLabel label="분석" style={styles} />
        <SectionCard style={styles}>
          <SettingsRow
            label="히스토리 자동 저장"
            sub="분석 완료 후 기록 탭에 자동 보관"
            trailing={<Toggle on={autoSave} onToggle={() => setAutoSave((p) => !p)} style={styles} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="저장 시 원본 표시 유지"
            sub="결과 화면에서 업로드 소스 힌트 유지"
            trailing={<Toggle on={includeOriginal} onToggle={() => setIncludeOriginal((p) => !p)} style={styles} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="XAI 히트맵 표시"
            sub="결과 화면에서 의심 영역을 시각화"
            trailing={<Text style={styles.onLabel}>ON</Text>}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="기록 전체 삭제"
            destructive
            isLast
            trailing={
              <Pressable onPress={clearAll}>
                <Ionicons name="chevron-forward" size={16} color={colors.ai} />
              </Pressable>
            }
            style={styles} colors={colors}
          />
        </SectionCard>

        {/* Info */}
        <SectionLabel label="정보" style={styles} />
        <SectionCard style={styles}>
          <SettingsRow
            label="분석 엔진 정보"
            sub="구조 / 맥락 / 디테일 3축 앙상블"
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="의심 영역 기준"
            sub="경계선, 질감, 배경 패턴 변화를 종합"
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="데이터 보관"
            sub="분석 기록은 이 기기에 저장"
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="온보딩 다시 보기"
            sub="앱 소개 화면을 처음부터 다시 봅니다"
            isLast
            trailing={
              <Pressable onPress={() => void resetOnboarding()}>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            }
            style={styles} colors={colors}
          />
        </SectionCard>

        {/* Backend connection */}
        <SectionLabel label="연결 설정" style={styles} />
        <SectionCard style={styles}>
          <View style={styles.urlSection}>
            <Text style={styles.urlLabel}>백엔드 주소</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setUrlInput}
              placeholder="http://서버주소:8000"
              placeholderTextColor={colors.muted}
              style={styles.urlInput}
              value={urlInput}
            />
            <Pressable style={styles.testBtn} onPress={() => void testConnection()}>
              <Text style={styles.testBtnText}>연결 테스트</Text>
            </Pressable>
            {connection ? (
              <Text style={[styles.connStatus, connection.includes("정상") && styles.connOk]}>{connection}</Text>
            ) : null}
          </View>
        </SectionCard>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>A-EYE 팀</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
