import * as ImageManipulator from "expo-image-manipulator";
import { MAX_IMAGE_SIZE } from "@/constants/config";

export async function resizeForAnalysis(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_SIZE } }],
    {
      compress: 0.78,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );
  return result.uri;
}

export function dataUriFromBase64(base64: string): string {
  return `data:image/png;base64,${base64}`;
}

export function makeImageName(prefix: string): string {
  return `${prefix}-${Date.now()}.jpg`;
}
