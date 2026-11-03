import { StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

/** `m:ss`, rounded up so 0:00 only shows when the time is really over. */
function formatClock(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

type Props = {
  ms: number;
  low: boolean;
  variant: 'me' | 'opponent';
};

/** A player's clock box: the shared question timer, frozen once they answered (docs/match-plan.md §5.3). */
export function MatchClock({ ms, low, variant }: Props) {
  const mine = variant === 'me';
  return (
    <Text
      style={[
        styles.clock,
        mine ? styles.mine : styles.opponent,
        mine && low && styles.mineLow,
        !mine && low && styles.opponentLow,
      ]}
      accessibilityLabel={mine ? 'وقتك' : 'وقت المنافس'}>
      {formatClock(ms)}
    </Text>
  );
}

const styles = StyleSheet.create({
  clock: {
    minWidth: 88,
    height: 46,
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    fontSize: 22,
    lineHeight: 46,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    writingDirection: 'ltr',
  },
  mine: {
    backgroundColor: Brand.text,
    color: Brand.background,
  },
  mineLow: {
    backgroundColor: Brand.danger,
    color: Brand.white,
  },
  opponent: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    color: Brand.textMuted,
  },
  opponentLow: {
    color: Brand.error,
  },
});
