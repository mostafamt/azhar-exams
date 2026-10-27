import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon, CloseIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

/** `correct` / `wrong` are for the review on the result screen. */
export type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong';

type Props = {
  letter: string;
  text: string;
  state: ChoiceState;
  /** Without it the choice is read-only (review). */
  onPress?: () => void;
};

const STATE_STYLES = {
  idle: { card: null, letter: null, letterText: null },
  selected: { card: 'selected', letter: 'letterSelected', letterText: 'letterTextOn' },
  correct: { card: 'correct', letter: 'letterCorrect', letterText: 'letterTextOn' },
  wrong: { card: 'wrong', letter: 'letterWrong', letterText: 'letterTextOn' },
} as const;

/** One answer: letter tile and text. */
export function ChoiceButton({ letter, text, state, onPress }: Props) {
  const variant = STATE_STYLES[state];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${letter}. ${text}`}
      accessibilityState={{ checked: state === 'selected', disabled: !onPress }}
      style={({ pressed }) => [styles.card, variant.card && styles[variant.card], pressed && styles.pressed]}>
      <View style={[styles.letter, variant.letter && styles[variant.letter]]}>
        <Text style={[styles.letterText, variant.letterText && styles[variant.letterText]]}>{letter}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
      {state === 'correct' && <CheckIcon color={Brand.success} size={20} />}
      {state === 'wrong' && <CloseIcon color={Brand.error} size={20} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
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
    backgroundColor: Brand.dangerSoft,
  },
  pressed: {
    opacity: 0.85,
  },
  letter: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterSelected: {
    backgroundColor: Brand.primaryBright,
  },
  letterCorrect: {
    backgroundColor: Brand.successStrong,
  },
  letterWrong: {
    backgroundColor: Brand.danger,
  },
  letterText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
    color: Brand.textMuted,
  },
  letterTextOn: {
    color: Brand.white,
  },
  text: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.semiBold,
    color: Brand.text,
  },
});
