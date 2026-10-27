import { StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { ChoiceButton, type ChoiceState } from '@/components/quiz/choice-button';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CHOICE_LETTERS, type Question } from '@/data/questions';
import { toArabicDigits } from '@/utils/arabic';

type Props = {
  questions: Question[];
  answers: (number | null)[];
  score: number;
  durationMs: number;
  onRestart: () => void;
  onHome: () => void;
};

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0
    ? `${toArabicDigits(minutes)} د ${toArabicDigits(rest)} ث`
    : `${toArabicDigits(rest)} ث`;
}

function choiceState(question: Question, answer: number | null, choice: number): ChoiceState {
  if (choice === question.correctIndex) return 'correct';
  if (choice === answer) return 'wrong';
  return 'idle';
}

/** Interim result screen until the Result design arrives (docs/quick-test-plan.md §2.8). */
export function QuizResult({ questions, answers, score, durationMs, onRestart, onHome }: Props) {
  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  const unanswered = answers.filter((answer) => answer === null).length;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.heading} accessibilityRole="header">
          نتيجة الاختبار
        </Text>
        <Text style={styles.score} accessibilityLabel={`${score} من ${total}`}>
          {toArabicDigits(score)} / {toArabicDigits(total)}
        </Text>
        <Text style={styles.percent}>{toArabicDigits(percent)}٪</Text>
        <View style={styles.stats}>
          <Stat label="صحيحة" value={score} color={Brand.success} />
          <Stat label="خاطئة" value={total - score - unanswered} color={Brand.error} />
          <Stat label="بدون إجابة" value={unanswered} color={Brand.textMuted} />
        </View>
        <Text style={styles.duration}>الوقت المستغرق: {formatDuration(durationMs)}</Text>
      </View>

      <View style={styles.actions}>
        <AuthButton title="اختبار جديد" onPress={onRestart} />
        <AuthButton title="العودة للرئيسية" variant="outline" onPress={onHome} />
      </View>

      <Text style={styles.reviewTitle} accessibilityRole="header">
        مراجعة الإجابات
      </Text>
      {questions.map((question, i) => (
        <View key={question.id} style={styles.review}>
          <Text style={styles.reviewQuestion}>
            {toArabicDigits(i + 1)}. {question.body}
          </Text>
          {answers[i] === null && <Text style={styles.unanswered}>لم تُجب عن هذا السؤال</Text>}
          {question.choices.map((choice, c) => (
            <ChoiceButton
              key={c}
              letter={CHOICE_LETTERS[c]}
              text={choice}
              state={choiceState(question, answers[i], c)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{toArabicDigits(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 20,
    padding: 20,
    gap: 4,
  },
  heading: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  score: {
    fontSize: 40,
    lineHeight: 60,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  percent: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  duration: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  actions: {
    gap: 10,
  },
  reviewTitle: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  review: {
    gap: 10,
    paddingBottom: 8,
  },
  reviewQuestion: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  unanswered: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.semiBold,
    color: Brand.accentBright,
  },
});
