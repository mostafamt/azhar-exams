import { StyleSheet, Text, View } from 'react-native';

import { ClockIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { weekEndsAt } from '@/utils/week';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Arabic counting: 1 and 2 have their own words, 3–10 take the plural, 11+ the singular. */
function count(n: number, one: string, two: string, few: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n <= 10 ? few : one}`;
}

/** «ينتهي خلال 3 أيام» (5 · Leagues). Days while there are any, then hours, then «أقل من ساعة». */
export function weekEndsIn(weekId: number, now: number) {
  const left = Math.max(0, weekEndsAt(weekId) - now);
  const days = Math.floor(left / DAY_MS);
  if (days >= 1) return `ينتهي خلال ${count(days, 'يوم', 'يومين', 'أيام')}`;
  const hours = Math.floor(left / HOUR_MS);
  if (hours >= 1) return `ينتهي خلال ${count(hours, 'ساعة', 'ساعتين', 'ساعات')}`;
  return 'ينتهي خلال أقل من ساعة';
}

export function WeekCountdown({ weekId, now }: { weekId: number; now: number }) {
  return (
    <View style={styles.row}>
      <ClockIcon color={Brand.textMuted} size={15} />
      <Text style={styles.text}>{weekEndsIn(weekId, now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
