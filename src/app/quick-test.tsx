import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { ConfirmModal } from '@/components/confirm-modal';
import { CloseIcon } from '@/components/icons';
import { ChoiceButton } from '@/components/quiz/choice-button';
import { QuestionCard } from '@/components/quiz/question-card';
import { QuizFooter } from '@/components/quiz/quiz-footer';
import { QuizHeader } from '@/components/quiz/quiz-header';
import { QuizResult } from '@/components/quiz/quiz-result';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CHOICE_LETTERS } from '@/data/questions';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { useQuiz } from '@/hooks/use-quiz';
import { toArabicDigits } from '@/utils/arabic';

const QUESTION_COUNT = 10;

type NavigationAction = Parameters<Parameters<typeof usePreventRemove>[1]>[0]['data']['action'];

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** «اختبار سريع»: random questions from the bank, then the result (docs/quick-test-plan.md). */
export default function QuickTestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const quiz = useQuiz(QUESTION_COUNT);
  // Set while the "leave the test?" dialog is open: the navigation it interrupted.
  const [exitAction, setExitAction] = useState<NavigationAction | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  useLightStatusBar();

  // ✕, the Android back button and any other way out ask first while the test is running.
  usePreventRemove(quiz.status === 'running', ({ data }) => setExitAction(data.action));

  function confirmExit() {
    if (exitAction) navigation.dispatch(exitAction);
    setExitAction(null);
  }

  const padding = { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 };

  if (quiz.status === 'finished') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.scrollContent, padding]}>
        <View style={styles.column}>
          <QuizResult
            questions={quiz.questions}
            answers={quiz.answers}
            score={quiz.score}
            durationMs={quiz.finishedAt - quiz.startedAt}
            onRestart={quiz.retry}
            onHome={leave}
          />
        </View>
      </ScrollView>
    );
  }

  if (quiz.status !== 'running') {
    let body;
    if (quiz.status === 'loading') body = <ActivityIndicator size="large" color={Brand.link} />;
    else {
      const message =
        quiz.status === 'error' ? 'تعذّر تحميل الأسئلة، تحقق من اتصالك بالإنترنت.' : 'لا توجد أسئلة بعد.';
      body = (
        <>
          <Text style={styles.message}>{message}</Text>
          {quiz.status === 'error' && <AuthButton title="إعادة المحاولة" onPress={quiz.retry} />}
        </>
      );
    }
    return (
      <View style={[styles.screen, styles.padded, padding]}>
        <View style={[styles.column, styles.fill]}>
          <Pressable
            onPress={leave}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <CloseIcon color={Brand.textMuted} size={20} />
          </Pressable>
          <View style={styles.center}>{body}</View>
        </View>
      </View>
    );
  }

  const { questions, index, answers, flagged } = quiz;
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const unansweredCount = answers.filter((answer) => answer === null).length;
  const flaggedCount = flagged.filter(Boolean).length;

  function next() {
    if (!isLast) quiz.go(index + 1);
    else if (unansweredCount > 0 || flaggedCount > 0) setConfirmFinish(true);
    else quiz.finish();
  }

  function reviewPending() {
    setConfirmFinish(false);
    const target = answers.findIndex((answer, i) => answer === null || flagged[i]);
    quiz.go(target === -1 ? 0 : target);
  }

  const pending = [
    unansweredCount > 0 && `${toArabicDigits(unansweredCount)} بدون إجابة`,
    flaggedCount > 0 && `${toArabicDigits(flaggedCount)} مميّز للمراجعة`,
  ].filter(Boolean);

  return (
    <View style={[styles.screen, styles.padded, padding]}>
      <View style={[styles.column, styles.fill, styles.runner]}>
        <QuizHeader index={index} total={questions.length} remaining={quiz.remaining} onClose={leave} />

        {/* Keyed by question, so each one starts scrolled to the top. */}
        <ScrollView key={question.id} style={styles.fill} contentContainerStyle={styles.questionContent}>
          <QuestionCard question={question} />
          <View style={styles.choices} accessibilityRole="radiogroup">
            {question.choices.map((choice, c) => (
              <ChoiceButton
                key={c}
                letter={CHOICE_LETTERS[c]}
                text={choice}
                state={answers[index] === c ? 'selected' : 'idle'}
                onPress={() => quiz.select(c)}
              />
            ))}
          </View>
        </ScrollView>

        <QuizFooter
          isFirst={index === 0}
          isLast={isLast}
          flagged={flagged[index]}
          onPrevious={() => quiz.go(index - 1)}
          onToggleFlag={quiz.toggleFlag}
          onNext={next}
        />
      </View>

      <ConfirmModal
        visible={exitAction !== null}
        title="إنهاء الاختبار؟"
        message="ستفقد إجاباتك في هذا الاختبار."
        confirmLabel="إنهاء"
        cancelLabel="متابعة الاختبار"
        destructive
        onConfirm={confirmExit}
        onCancel={() => setExitAction(null)}
      />
      <ConfirmModal
        visible={confirmFinish}
        title="إنهاء الاختبار؟"
        message={`لديك ${pending.join(' و')}.`}
        confirmLabel="إنهاء"
        cancelLabel="مراجعة"
        onConfirm={() => {
          setConfirmFinish(false);
          quiz.finish();
        }}
        onCancel={reviewPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  padded: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Phone width on large screens (web), centered.
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  fill: {
    flex: 1,
  },
  runner: {
    gap: 18,
  },
  questionContent: {
    gap: 18,
  },
  choices: {
    gap: 10,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
