import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackIcon, BookmarkIcon, ForwardIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  isFirst: boolean;
  isLast: boolean;
  flagged: boolean;
  onPrevious: () => void;
  onToggleFlag: () => void;
  /** «التالي», or «إنهاء الاختبار» on the last question. */
  onNext: () => void;
};

/** «السابق», the review flag and «التالي». In RTL «السابق» is on the right. */
export function QuizFooter({ isFirst, isLast, flagged, onPrevious, onToggleFlag, onNext }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPrevious}
        disabled={isFirst}
        accessibilityRole="button"
        accessibilityState={{ disabled: isFirst }}
        style={({ pressed }) => [styles.previous, isFirst && styles.disabled, pressed && styles.pressed]}>
        <BackIcon color={Brand.text} size={18} />
        <Text style={styles.previousText}>السابق</Text>
      </Pressable>
      <Pressable
        onPress={onToggleFlag}
        accessibilityRole="button"
        accessibilityLabel="تمييز السؤال للمراجعة"
        accessibilityState={{ selected: flagged }}
        style={({ pressed }) => [styles.flag, flagged && styles.flagOn, pressed && styles.pressed]}>
        <BookmarkIcon color={flagged ? Brand.accentBright : Brand.textMuted} size={20} />
      </Pressable>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
        <Text style={styles.nextText}>{isLast ? 'إنهاء الاختبار' : 'التالي'}</Text>
        {!isLast && <ForwardIcon color={Brand.white} size={18} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previous: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previousText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.semiBold,
    color: Brand.text,
  },
  disabled: {
    opacity: 0.4,
  },
  flag: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagOn: {
    borderColor: Brand.accent,
    backgroundColor: Brand.accentSoft,
  },
  next: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: Brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.white,
  },
  pressed: {
    opacity: 0.85,
  },
});
