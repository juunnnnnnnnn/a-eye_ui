import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

type Props = { size?: number };

export function Logo({ size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#06B6D4" />
          <Stop offset="100%" stopColor="#5B6BFF" />
        </LinearGradient>
      </Defs>
      <Circle cx={22} cy={24} r={14} stroke="url(#logoGrad)" strokeWidth={3} fill="none" opacity={0.85} />
      <Circle cx={42} cy={24} r={14} stroke="url(#logoGrad)" strokeWidth={3} fill="none" opacity={0.85} />
      <Circle cx={32} cy={40} r={14} stroke="url(#logoGrad)" strokeWidth={3} fill="none" opacity={0.85} />
      <Circle cx={32} cy={29.5} r={5} fill="url(#logoGrad)" />
    </Svg>
  );
}
