import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CloseIcon } from '@/components/icons';
import { TimerPill } from '@/components/quiz/timer-pill';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { toArabicDigits } from '@/utils/arabic';

type Props = {
  index: number;
  total: number;
  remaining: number;
  onClose: () => void;
};

/** ✕, «السؤال ٥ من ١٠», the timer and the progress bar. */
export function QuizHeader({ index, total, remaining, onClose }: Props) {
  const current = index + 1;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="إنهاء الاختبار"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <CloseIcon color={Brand.textMuted} size={20} />
        </Pressable>
        <Text style={styles.counter} accessibilityRole="header">
          السؤال {toArabicDigits(current)} من {toArabicDigits(total)}
        </Text>
        <TimerPill remaining={remaining} />
      </View>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="التقدم في الاختبار"
        accessibilityValue={{ min: 0, max: total, now: current }}>
        <View style={[styles.fill, { width: `${(current / total) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  counter: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Brand.primaryBright,
  },
});
