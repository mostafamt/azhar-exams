import Svg, { G, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/colors';

// Paths copied from the design mockups (docs/1 · Welcome & Auth-html). All are decorative.

type IconProps = { color: string; size?: number };

function StrokeIcon({ color, size = 24, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
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
