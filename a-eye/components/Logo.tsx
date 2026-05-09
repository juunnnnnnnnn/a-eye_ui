import { Image } from "expo-image";

type Props = { size?: number };

export function Logo({ size = 22 }: Props) {
  return (
    <Image
      source={require("../assets/logo.png")}
      style={{ borderRadius: size * 0.22, height: size, width: size }}
      contentFit="contain"
    />
  );
}
