import Svg, { Path } from 'react-native-svg';

import { Brand } from '@/constants/colors';

const PATHS = { right: 'm5 12 5 5 9-10', wrong: 'M6 6l12 12M18 6 6 18', none: 'M8 12h8' };

/** No answer yet. */
export const MARK_NONE = '#475569';

export function markColor(correct: boolean | null) {
  return correct === null ? MARK_NONE : correct ? Brand.success : Brand.error;
}

/** ✓ / ✗ / – for an answer (7b · Live Match). Decorative. */
export function Mark({ correct, size = 13, color }: { correct: boolean | null; size?: number; color?: string }) {
  const d = correct === null ? PATHS.none : correct ? PATHS.right : PATHS.wrong;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? markColor(correct)}
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}
