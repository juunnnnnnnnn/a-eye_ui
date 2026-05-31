import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LEGAL_DOCS, type DocTopic } from "@/constants/legal";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";

type DocParams = { topic?: string };

function readParam(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function isDocTopic(value: string | undefined): value is DocTopic {
  return value != null && value in LEGAL_DOCS;
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    appBar: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      paddingBottom: 12,
      paddingHorizontal: 12,
      paddingTop: 8
    },
    appBarTitle: { color: c.fg, fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
    backBtn: {
      alignItems: "center",
      backgroundColor: c.surface2,
      borderColor: c.border,
      borderRadius: 12,
      borderWidth: 1,
      height: 36,
      justifyContent: "center",
      width: 36
    },
    body: { color: c.muted, fontSize: 14, lineHeight: 22, marginBottom: 8 },
    container: { padding: 20, paddingBottom: 60 },
    heading: { color: c.fg, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 22 },
    intro: { color: c.muted, fontSize: 14, lineHeight: 22, marginBottom: 4 },
    safe: { backgroundColor: c.bg, flex: 1 },
    title: { color: c.fg, fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginBottom: 6 },
    updated: { color: c.muted, fontSize: 11, fontWeight: "500", letterSpacing: 0.3, marginBottom: 16, opacity: 0.8 }
  });
}

export default function DocScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<DocParams>();
  const topic = readParam(params.topic);
  const doc = isDocTopic(topic) ? LEGAL_DOCS[topic] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="뒤로">
          <Ionicons name="chevron-back" size={18} color={colors.fg} />
        </Pressable>
        <Text style={styles.appBarTitle} numberOfLines={1}>
          {doc ? doc.title : "정보"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {doc ? (
          <>
            <Text style={styles.title}>{doc.title}</Text>
            {doc.updated ? <Text style={styles.updated}>시행일 · {doc.updated}</Text> : null}
            {doc.intro ? <Text style={styles.intro}>{doc.intro}</Text> : null}
            {doc.sections.map((section, si) => (
              <View key={si}>
                {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
                {section.body.map((line, li) => (
                  <Text key={li} style={styles.body}>
                    {line}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.body}>문서를 찾을 수 없습니다.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
