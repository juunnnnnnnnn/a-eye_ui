import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTheme } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName, focusedName: IconName) {
  return function Icon({ color, focused }: { color: string; focused: boolean }) {
    return <Ionicons name={focused ? focusedName : name} size={22} color={color} />;
  };
}

export default function TabsLayout() {
  const { colors, resolved } = useTheme();
  const tabBarBg =
    resolved === "dark" ? "rgba(10,14,26,0.96)" : "rgba(255,255,255,0.92)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: colors.border,
          height: 82,
          paddingBottom: 22,
          paddingTop: 10
        }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "홈", tabBarIcon: tabIcon("home-outline", "home") }} />
      <Tabs.Screen name="history" options={{ title: "기록", tabBarIcon: tabIcon("time-outline", "time") }} />
      <Tabs.Screen name="settings" options={{ title: "설정", tabBarIcon: tabIcon("settings-outline", "settings") }} />
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  );
}
