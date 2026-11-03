import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mark, markColor } from '@/components/match/mark';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  letter: string;
  text: string;
  /** Picked, not confirmed yet. */
  selected: boolean;
  /** Show right and wrong: after I answered, or once the question is over. */
  revealed: boolean;
  correct: boolean;
  /** I answered this one. */
  mine: boolean;
  myInitial: string;
  /** The opponent answered this one (only once their answer is visible). */
  opponent: { initial: string; correct: boolean } | null;
  /** Half width in the 2×2 grid; false for long answers, one per row. */
  half: boolean;
  disabled: boolean;
  onPress: () => void;
};

/** One answer in the live match, with a badge for each player who picked it (7b). */
export function MatchChoice({
  letter,
  text,
  selected,
  revealed,
  correct,
  mine,
  myInitial,
  opponent,
  half,
  disabled,
  onPress,
}: Props) {
  const state = revealed && correct ? 'correct' : revealed && mine ? 'wrong' : selected ? 'selected' : 'idle';
  const description = [
    opponent && (opponent.correct ? 'اختارها المنافس وهي صحيحة' : 'اختارها المنافس وهي خاطئة'),
    mine && 'إجابتك',
    revealed && correct && 'الإجابة الصحيحة',
  ]
    .filter(Boolean)
    .join('، ');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={`${letter}. ${text}${description ? `، ${description}` : ''}`}
      accessibilityState={{ checked: selected || mine, disabled }}
      style={({ pressed }) => [
        styles.card,
        half ? styles.half : styles.full,
        styles[state],
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={[styles.letter, letterStyles[state]]}>
        <Text style={[styles.letterText, letterTextStyles[state]]}>{letter}</Text>
      </View>
      <Text style={[styles.text, half && styles.textShort]} numberOfLines={4}>
        {text}
      </Text>

      {mine && (
        <View style={[styles.badge, styles.myBadge]}>
          <Text style={styles.myBadgeText}>{myInitial}</Text>
        </View>
      )}
      {opponent && (
        <View style={[styles.badge, styles.opponentBadge, { borderColor: markColor(opponent.correct) }]}>
          <View style={styles.opponentAvatar}>
            <Text style={styles.opponentInitial}>{opponent.initial}</Text>
          </View>
          <Mark correct={opponent.correct} size={12} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  // Two per row; flexGrow takes up what the gap leaves.
  half: {
    width: '45%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  full: {
    width: '100%',
  },
  idle: {},
  selected: {
    borderColor: Brand.primaryBright,
    backgroundColor: 'rgba(99,102,241,0.16)',
    boxShadow: '0 0 0 4px rgba(99,102,241,0.18)',
  },
  correct: {
    borderColor: Brand.successStrong,
    backgroundColor: Brand.successSoft,
  },
  wrong: {
    borderColor: Brand.danger,
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  pressed: {
    opacity: 0.85,
  },
  letter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.extraBold,
    color: Brand.textMuted,
  },
  text: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  // Short answers (numbers, single words) are big, as in the design.
  textShort: {
    flex: 0,
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 32,
    fontFamily: Fonts.extraBold,
  },
  badge: {
    position: 'absolute',
    top: -10,
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  myBadge: {
    start: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Brand.primaryPale,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myBadgeText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.extraBold,
    color: Brand.white,
  },
  opponentBadge: {
    end: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingStart: 3,
    paddingEnd: 6,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: '#78350F',
  },
  opponentAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opponentInitial: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.extraBold,
    color: Brand.ink,
  },
});

const letterStyles = StyleSheet.create({
  idle: { backgroundColor: Brand.background },
  selected: { backgroundColor: Brand.primaryBright },
  correct: { backgroundColor: Brand.successStrong },
  wrong: { backgroundColor: Brand.danger },
});

const letterTextStyles = StyleSheet.create({
  idle: {},
  selected: { color: Brand.white },
  correct: { color: '#022C22' },
  wrong: { color: Brand.white },
});
