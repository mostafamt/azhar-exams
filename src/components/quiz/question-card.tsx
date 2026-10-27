import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { Question } from '@/data/questions';

/**
 * Subject chip, points and the question text. The design's image box waits for questions to
 * have their own image (docs/quick-test-plan.md §2.5).
 */
export function QuestionCard({ question }: { question: Question }) {
  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <Chip label={question.source?.subjectName || 'عام'} tone="indigo" />
        <Text style={styles.points}>درجة واحدة</Text>
      </View>
      <Text style={styles.body}>{question.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  points: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  body: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
});
