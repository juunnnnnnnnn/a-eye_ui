import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/lib/theme";

function RootLayoutInner() {
  const { resolved, colors } = useTheme();
  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerShown: false
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="loading" />
        <Stack.Screen name="result" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="consent" />
        <Stack.Screen name="doc" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
