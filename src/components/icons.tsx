import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/colors';

// Paths copied from the design mockups (docs/1 · Welcome & Auth-html, docs/1a · Email Login-html).
// All are decorative.

type IconProps = { color: string; size?: number };

function StrokeIcon({
  color,
  size = 24,
  strokeWidth = 2,
  children,
}: IconProps & { strokeWidth?: number; children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <Path d="M14 3v5h5M9 13h6M9 17h4" />
    </StrokeIcon>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </StrokeIcon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M3 21h18M6 17v-5M11 17V7M16 17v-8" />
    </StrokeIcon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Path d="m3 7 9 6 9-6" />
    </StrokeIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Rect x={5} y={11} width={14} height={10} rx={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </StrokeIcon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx={12} cy={12} r={3} />
    </StrokeIcon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M10.7 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1" />
      <Path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
    </StrokeIcon>
  );
}

/** Points right: "back" in RTL. */
export function BackIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="m9 6 6 6-6 6" />
    </StrokeIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={3} {...props}>
      <Path d="M5 12.5 10 17 19 7" />
    </StrokeIcon>
  );
}

/** White circle with a blue "G", as in the designs' Google buttons. */
export function GoogleBadge({ size = 26 }: { size?: number }) {
  return (
    <View
      style={[styles.googleBadge, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Text style={[styles.googleLetter, { fontSize: Math.round(size * 0.6) }]}>G</Text>
    </View>
  );
}

/** The cap-and-star mark inside the logo tile. */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(0 4)">
        <Path
          d="M15 27v5a17 17 0 0 0 34 0v-5"
          fill="none"
          stroke={Brand.white}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <Path d="M32 3l3.2 7.8L43 14l-7.8 3.2L32 25l-3.2-7.8L21 14l7.8-3.2z" fill={Brand.accent} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  googleBadge: {
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter: {
    color: Brand.google,
    fontWeight: '700',
  },
});
