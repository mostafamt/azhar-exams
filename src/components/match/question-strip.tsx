import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Mark } from '@/components/match/mark';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { MatchPlayer } from '@/data/matches';

const TILE = 38;
const GAP = 6;

type Props = {
  total: number;
  current: number;
  me: MatchPlayer | undefined;
  opp: MatchPlayer | undefined;
  /** The opponent's answer to `current` may be shown. */
  oppVisible: boolean;
  /** The current question is over: a missing answer counts as wrong. */
  over: boolean;
};

/**
 * One tile per question with my mark and the opponent's (7b). Shows as many tiles as fit,
 * keeping the current one in view, instead of a horizontal scroll (which RTL makes unreliable).
 */
export function QuestionStrip({ total, current, me, opp, oppVisible, over }: Props) {
  const [width, setWidth] = useState(0);
  const fit = Math.max(1, Math.floor((width + GAP) / (TILE + GAP)));
  const count = Math.min(total, fit);
  const first = Math.max(0, Math.min(current - Math.floor(count / 2), total - count));

  function markFor(player: MatchPlayer | undefined, k: number, visible: boolean): boolean | null {
    const answer = player?.answers[k];
    if (k < current) return !!answer?.correct;
    if (k > current || !visible) return null;
    if (answer) return answer.correct;
    return over ? false : null;
  }

  return (
    <View
      style={styles.strip}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel="سجل الأسئلة">
      {width > 0 &&
        Array.from({ length: count }, (_, i) => {
          const k = first + i;
          const state = k === current ? 'current' : k < current ? 'done' : 'next';
          return (
            <View key={k} style={[styles.tile, tileStyles[state]]}>
              <Text style={[styles.number, numberStyles[state]]}>{k + 1}</Text>
              <View style={styles.marks}>
                <Mark correct={markFor(me, k, true)} />
                <Mark correct={markFor(opp, k, oppVisible)} />
              </View>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: GAP,
    height: 44,
  },
  tile: {
    width: TILE,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  number: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.bold,
  },
  marks: {
    flexDirection: 'row',
    gap: 2,
  },
});

const tileStyles = StyleSheet.create({
  current: { backgroundColor: Brand.primarySoft, borderColor: Brand.primaryBright },
  done: { backgroundColor: Brand.surface, borderColor: Brand.border },
  next: { backgroundColor: 'transparent', borderColor: Brand.surface },
});

const numberStyles = StyleSheet.create({
  current: { color: Brand.primaryPale },
  done: { color: Brand.text },
  next: { color: '#475569' },
});
