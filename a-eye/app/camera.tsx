import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/PrimaryButton";
import { makeImageName, resizeForAnalysis } from "@/lib/image";
import { useTheme } from "@/lib/theme";
import type { ColorTokens } from "@/constants/colors";

type CameraFacing = "front" | "back";

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    blank: { backgroundColor: c.black, flex: 1 },
    bottom: {
      alignItems: "center", flexDirection: "row",
      justifyContent: "space-between", marginTop: "auto", padding: 24
    },
    camera: { flex: 1 },
    close: {
      alignSelf: "flex-start", backgroundColor: "rgba(15,23,42,0.58)",
      borderRadius: 999, margin: 20, paddingHorizontal: 16, paddingVertical: 10
    },
    closeText: { color: c.white, fontSize: 14, fontWeight: "800" },
    container: { backgroundColor: c.black, flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject },
    permission: {
      backgroundColor: c.bg, flex: 1, gap: 14,
      justifyContent: "center", padding: 24
    },
    permissionText: { color: c.muted, fontSize: 14, lineHeight: 22, marginBottom: 8 },
    permissionTitle: { color: c.fg, fontSize: 24, fontWeight: "900" },
    shutter: {
      alignItems: "center", backgroundColor: "rgba(255,255,255,0.35)",
      borderColor: c.white, borderRadius: 999, borderWidth: 4,
      height: 78, justifyContent: "center", width: 78
    },
    shutterInner: { backgroundColor: c.white, borderRadius: 999, height: 54, width: 54 },
    switchButton: {
      alignItems: "center", backgroundColor: "rgba(15,23,42,0.58)",
      borderRadius: 999, height: 54, justifyContent: "center", width: 54
    },
    switchText: { color: c.white, fontSize: 13, fontWeight: "900" }
  });
}

export default function CameraScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraFacing>("back");
  const [taking, setTaking] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 1 });
      if (!photo?.uri) {
        Alert.alert("촬영 실패", "사진을 촬영하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      let imageUri = photo.uri;
      try {
        imageUri = await resizeForAnalysis(photo.uri);
      } catch (resizeError) {
        console.warn("촬영 이미지 리사이즈 실패, 원본으로 분석합니다.", resizeError);
      }
      router.replace({ pathname: "/loading", params: { imageUri, imageName: makeImageName("camera") } });
    } catch {
      Alert.alert("촬영 실패", "사진을 촬영하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setTaking(false);
    }
  };

  if (!permission) return <View style={styles.blank} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
        <Text style={styles.permissionText}>이미지 분석을 위해 촬영 권한을 허용해 주세요.</Text>
        <PrimaryButton label="권한 허용" onPress={() => void requestPermission()} />
        <PrimaryButton label="홈으로" variant="secondary" onPress={() => router.replace("/(tabs)/home")} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <SafeAreaView style={styles.overlay}>
        <Pressable style={styles.close} onPress={() => router.back()}>
          <Text style={styles.closeText}>닫기</Text>
        </Pressable>
        <View style={styles.bottom}>
          <Pressable
            style={styles.switchButton}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          >
            <Text style={styles.switchText}>전환</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.shutter, taking && { opacity: 0.5 }]}
            onPress={() => void takePicture()}
            disabled={taking}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.switchButton} />
        </View>
      </SafeAreaView>
    </View>
  );
}
