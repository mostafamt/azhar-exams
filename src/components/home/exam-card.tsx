import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { CalendarIcon, DocumentIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { examTitle, termLabel, type SectionExam } from '@/data/content';
import { toArabicDigits } from '@/utils/arabic';

/** «صفحة واحدة», «صفحتان», «٣ صفحات», «١١ صفحة». */
function pagesLabel(count: number) {
  if (count === 1) return 'صفحة واحدة';
  if (count === 2) return 'صفحتان';
  const word = count >= 3 && count <= 10 ? 'صفحات' : 'صفحة';
  return `${toArabicDigits(count)} ${word}`;
}

/**
 * The design's exam card, filled with what a scanned exam has: subject and term chips
 * instead of subject and difficulty, page count and year instead of questions and minutes.
 */
export function ExamCard({ exam, onOpen }: { exam: SectionExam; onOpen: () => void }) {
  const term = termLabel(exam.term);
  const title = examTitle(exam);
  const pages = exam.images?.length ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.chips}>
        <Chip label={exam.subject.name} tone="indigo" />
        {term && <Chip label={term} tone="amber" />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.footer}>
        <View style={styles.meta}>
          {pages > 0 && (
            <View style={styles.metaItem}>
              <DocumentIcon color={Brand.textMuted} size={15} />
              <Text style={styles.metaText}>{pagesLabel(pages)}</Text>
            </View>
          )}
          {exam.year ? (
            <View style={styles.metaItem}>
              <CalendarIcon color={Brand.textMuted} size={15} />
              <Text style={styles.metaText}>{toArabicDigits(exam.year)}</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`افتح ${exam.subject.name}، ${title}`}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>افتح</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  meta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.white,
  },
});
