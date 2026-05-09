import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { dataUriFromBase64 } from "@/lib/image";
import { useTheme } from "@/lib/theme";

type ImageToggleProps = {
  originalUri: string;
  heatmapB64: string;
  overlayB64: string;
};

type TabKey = "original" | "heatmap" | "overlay";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "original", label: "원본" },
  { key: "heatmap", label: "히트맵" },
  { key: "overlay", label: "오버레이" }
];

export function ImageToggle({ originalUri, heatmapB64, overlayB64 }: ImageToggleProps) {
  const { colors } = useTheme();
  const [active, setActive] = useState<TabKey>("original");
  const source =
    active === "original" ? originalUri
    : active === "heatmap" ? dataUriFromBase64(heatmapB64)
    : dataUriFromBase64(overlayB64);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image source={{ uri: source }} style={[styles.image, { backgroundColor: colors.surface2 }]} contentFit="cover" transition={160} />
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const selected = active === tab.key;
          return (
            <Pressable
              accessibilityRole="button"
              key={tab.key}
              onPress={() => setActive(tab.key)}
              style={[styles.tab, selected && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.tabText, { color: selected ? "#fff" : colors.muted }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  image: { aspectRatio: 1, width: "100%" },
  tab: { alignItems: "center", borderRadius: 12, flex: 1, paddingVertical: 10 },
  tabText: { fontSize: 13, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 8, padding: 10 }
});
