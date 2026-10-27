import { StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

const TONES = {
  indigo: { backgroundColor: Brand.primarySoft, color: Brand.link },
  amber: { backgroundColor: Brand.accentSoft, color: Brand.accentBright },
  green: { backgroundColor: Brand.successSoft, color: Brand.success },
  // Solid badges on the announcement cards.
  solidAmber: { backgroundColor: Brand.accent, color: Brand.ink },
  solidGreen: { backgroundColor: Brand.successStrong, color: '#022C22' },
  solidIndigo: { backgroundColor: Brand.link, color: Brand.ink },
};

export type ChipTone = keyof typeof TONES;

/** Small rounded label, e.g. a subject or term on an exam card. */
export function Chip({ label, tone }: { label: string; tone: ChipTone }) {
  const { backgroundColor, color } = TONES[tone];
  return <Text style={[styles.chip, { backgroundColor, color }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Fonts.bold,
  },
});
