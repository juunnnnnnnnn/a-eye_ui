import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/lib/theme";
import { safeGetString } from "@/lib/storage";
import type { ColorTokens } from "@/constants/colors";

const ONBOARDING_KEY = "aeye.onboardingDone";

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: c.bg,
      flex: 1,
      justifyContent: "center"
    },
    logoWrap: {
      alignItems: "center",
      borderRadius: 999,
      height: 132,
      justifyContent: "center",
      width: 132
    },
    subtitle: {
      color: c.muted,
      fontSize: 13,
      fontWeight: "500",
      letterSpacing: 0.4,
      marginTop: 10
    },
    title: {
      color: c.fg,
      fontSize: 36,
      fontWeight: "800",
      letterSpacing: 2.5,
      marginTop: 20
    }
  });
}

export default function SplashScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const done = await safeGetString(ONBOARDING_KEY);
      if (done) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/onboarding");
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Logo size={108} />
      </View>
      <Text style={styles.title}>A-EYE</Text>
      <Text style={styles.subtitle}>AI 이미지 판별기</Text>
    </View>
  );
}
