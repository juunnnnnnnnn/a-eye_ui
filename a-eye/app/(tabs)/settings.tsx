import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { SwipeTabs } from "@/components/SwipeTabs";
import { useHistory } from "@/hooks/useHistory";
import { safeGetString, safeRemoveItem, safeSetString, STORAGE_KEYS } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { ThemeMode } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";
import type { DocTopic } from "@/constants/legal";

const ONBOARDING_KEY = "aeye.onboardingDone";

function openDoc(topic: DocTopic) {
  router.push({ pathname: "/doc", params: { topic } });
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingBottom: 12, paddingHorizontal: 20, paddingTop: 8
    },
    appBarRight: { alignItems: "center", flexDirection: "row", gap: 10 },
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
    row: {
      alignItems: "center", flexDirection: "row", gap: 12,
      paddingHorizontal: 14, paddingVertical: 13
    },
    rowBorder: { borderBottomColor: c.border, borderBottomWidth: 1 },
    rowIcon: { alignItems: "center", borderRadius: 10, height: 32, justifyContent: "center", width: 32 },
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
    toggleOn: { backgroundColor: c.primary }
  });
}

function SectionLabel({ label, style }: { label: string; style: ReturnType<typeof makeStyles> }) {
  return <Text style={style.sectionLabel}>{label}</Text>;
}

function SectionCard({ children, style }: { children: React.ReactNode; style: ReturnType<typeof makeStyles> }) {
  return <View style={style.sectionCard}>{children}</View>;
}

function SettingsRow({
  label, sub, icon, trailing, destructive, isLast, onPress, style, colors
}: {
  label: string; sub?: string; icon?: keyof typeof Ionicons.glyphMap; trailing?: React.ReactNode;
  destructive?: boolean; isLast?: boolean; onPress?: () => void;
  style: ReturnType<typeof makeStyles>; colors: ColorTokens;
}) {
  const tint = destructive ? colors.ai : colors.primary;
  const content = (
    <>
      {icon ? (
        <View style={[style.rowIcon, { backgroundColor: destructive ? colors.aiSoft : "rgba(91,107,255,0.1)" }]}>
          <Ionicons name={icon} size={17} color={tint} />
        </View>
      ) : null}
      <View style={style.rowText}>
        <Text style={[style.rowLabel, destructive && { color: colors.ai }]}>{label}</Text>
        {sub ? <Text style={style.rowSub}>{sub}</Text> : null}
      </View>
      <View>{trailing}</View>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        style={[style.row, !isLast && style.rowBorder]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={[style.row, !isLast && style.rowBorder]}>{content}</View>;
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
  const { deleteAll } = useHistory();
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => {
    void safeGetString(STORAGE_KEYS.autoSave).then((v) => {
      if (v != null) setAutoSave(v === "1");
    });
  }, []);

  const toggleAutoSave = () => {
    setAutoSave((prev) => {
      const next = !prev;
      void safeSetString(STORAGE_KEYS.autoSave, next ? "1" : "0");
      return next;
    });
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
    <SwipeTabs index={2}>
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
            icon="save-outline"
            trailing={<Toggle on={autoSave} onToggle={toggleAutoSave} style={styles} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="기록 전체 삭제"
            icon="trash-outline"
            destructive
            isLast
            onPress={clearAll}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.ai} />}
            style={styles} colors={colors}
          />
        </SectionCard>

        {/* Info */}
        <SectionLabel label="정보" style={styles} />
        <SectionCard style={styles}>
          <SettingsRow
            label="분석 엔진 정보"
            sub="구조 / 맥락 / 디테일 3축 앙상블"
            icon="layers-outline"
            onPress={() => openDoc("engine")}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="의심 영역 기준"
            sub="경계선, 질감, 배경 패턴 변화를 종합"
            icon="scan-outline"
            onPress={() => openDoc("criteria")}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="데이터 보관"
            sub="분석 기록은 이 기기에 저장"
            icon="lock-closed-outline"
            onPress={() => openDoc("data")}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="온보딩 다시 보기"
            sub="앱 소개 화면을 처음부터 다시 봅니다"
            icon="play-circle-outline"
            isLast
            onPress={() => void resetOnboarding()}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
        </SectionCard>

        {/* Legal */}
        <SectionLabel label="약관 및 정책" style={styles} />
        <SectionCard style={styles}>
          <SettingsRow
            label="이용약관"
            icon="document-text-outline"
            onPress={() => openDoc("terms")}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="개인정보 처리방침"
            icon="shield-checkmark-outline"
            onPress={() => openDoc("privacy")}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
          <SettingsRow
            label="오픈소스 라이선스"
            icon="code-slash-outline"
            isLast
            onPress={() => openDoc("opensource")}
            trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
            style={styles} colors={colors}
          />
        </SectionCard>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>A-EYE 팀</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </SwipeTabs>
  );
}
