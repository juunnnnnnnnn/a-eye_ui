import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
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
      justifyContent: "space-between", paddingHorizontal: 28, paddingBottom: 28, paddingTop: 8
    },
    camera: { flex: 1 },
    container: { backgroundColor: c.black, flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject },
    topBar: {
      alignItems: "center", flexDirection: "row", justifyContent: "space-between",
      paddingHorizontal: 18, paddingTop: 8
    },
    iconBtn: {
      alignItems: "center", backgroundColor: "rgba(15,23,42,0.5)", borderRadius: 999,
      height: 44, justifyContent: "center", width: 44
    },
    hintPill: {
      backgroundColor: "rgba(15,23,42,0.5)", borderRadius: 999,
      paddingHorizontal: 14, paddingVertical: 8
    },
    hintText: { color: c.white, fontSize: 12, fontWeight: "600" },
    frameWrap: { alignItems: "center", flex: 1, justifyContent: "center" },
    frameBox: { height: 256, width: 256 },
    corner: { borderColor: "rgba(255,255,255,0.92)", height: 32, position: "absolute", width: 32 },
    cTL: { borderLeftWidth: 3, borderTopLeftRadius: 10, borderTopWidth: 3, left: 0, top: 0 },
    cTR: { borderRightWidth: 3, borderTopRightRadius: 10, borderTopWidth: 3, right: 0, top: 0 },
    cBL: { borderBottomWidth: 3, borderBottomLeftRadius: 10, borderLeftWidth: 3, bottom: 0, left: 0 },
    cBR: { borderBottomRightRadius: 10, borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
    permission: {
      backgroundColor: c.bg, flex: 1, gap: 14,
      justifyContent: "center", padding: 24
    },
    permissionText: { color: c.muted, fontSize: 14, lineHeight: 22, marginBottom: 8 },
    permissionTitle: { color: c.fg, fontSize: 24, fontWeight: "900" },
    shutter: {
      alignItems: "center", backgroundColor: "rgba(255,255,255,0.28)",
      borderColor: c.white, borderRadius: 999, borderWidth: 4,
      height: 80, justifyContent: "center", width: 80
    },
    shutterInner: { backgroundColor: c.white, borderRadius: 999, height: 58, width: 58 },
    switchButton: {
      alignItems: "center", backgroundColor: "rgba(15,23,42,0.5)",
      borderRadius: 999, height: 54, justifyContent: "center", width: 54
    }
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
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="닫기">
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.hintPill}>
            <Text style={styles.hintText}>분석할 대상을 화면에 담아주세요</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frameBox}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={styles.switchButton}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            accessibilityLabel="카메라 전환"
          >
            <Ionicons name="camera-reverse-outline" size={24} color={colors.white} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.shutter, taking && { opacity: 0.5 }]}
            onPress={() => void takePicture()}
            disabled={taking}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={{ width: 54 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}
