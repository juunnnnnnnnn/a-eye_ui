import type { ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { router } from "expo-router";

// 하단 탭과 동일한 좌→우 순서. 홈에서 왼쪽으로 밀면 기록, 한 번 더 밀면 설정.
const TAB_ORDER = ["/(tabs)/home", "/(tabs)/history", "/(tabs)/settings"] as const;

function goTo(index: number) {
  if (index < 0 || index >= TAB_ORDER.length) {
    return;
  }
  router.replace(TAB_ORDER[index]!);
}

/**
 * 탭 화면을 가로 스와이프로 전환합니다.
 * - 가로 24px 이상 움직여야 활성화되고, 세로 16px을 먼저 넘으면 실패 처리되어
 *   리스트/스크롤의 세로 스크롤과 충돌하지 않습니다.
 */
export function SwipeTabs({ index, children }: { index: number; children: ReactNode }) {
  const pan = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      "worklet";
      if (event.translationX <= -60) {
        runOnJS(goTo)(index + 1);
      } else if (event.translationX >= 60) {
        runOnJS(goTo)(index - 1);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}
