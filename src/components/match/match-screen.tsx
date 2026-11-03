import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { ConfirmModal } from '@/components/confirm-modal';
import { BackIcon, ChatIcon, CheckIcon, CloseIcon, LockIcon } from '@/components/icons';
import { Mark, markColor } from '@/components/match/mark';
import { MatchChoice } from '@/components/match/match-choice';
import { MatchResult } from '@/components/match/match-result';
import { PlayerRow, PlayerStatus, ThinkingStatus } from '@/components/match/player-row';
import { QuestionStrip } from '@/components/match/question-strip';
import { ScorePill } from '@/components/match/score-pill';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { MatchSource } from '@/data/match-source';
import { PRESETS, REACTIONS, type Match } from '@/data/matches';
import { CHOICE_LETTERS } from '@/data/questions';
import { settleMatch } from '@/data/ratings';
import { useAuth } from '@/hooks/use-auth';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { useMatch } from '@/hooks/use-match';
import { toArabicDigits } from '@/utils/arabic';

type NavigationAction = Parameters<Parameters<typeof usePreventRemove>[1]>[0]['data']['action'];

/** Answers up to this long fit two per row, big, as in the design; longer ones get a row each. */
const SHORT_CHOICE = 14;

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** «رياضيات · مباراة مصنّفة»; the bot's matches are practice. */
function matchTitle(match: Match, bot: boolean) {
  if (bot) return `تدريب · ${PRESETS[match.preset].label}`;
  return `${match.subjectName || 'متنوع'} · ${match.ranked ? 'مباراة مصنّفة' : 'مباراة ودية'}`;
}

/**
 * The live 1v1 match in lockstep (7b · Live Match, docs/match-plan.md §5), then its result.
 * Rendered by /match/[id] (a Firestore match) and /match/bot (practice on this phone).
 */
export function MatchScreen({ source }: { source: MatchSource }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const uid = user?.uid ?? '';
  const myself = { uid, name: profile?.name ?? '' };
  const m = useMatch(source, uid);
  // Set while the "leave the match?" dialog is open: the navigation it interrupted.
  const [exitAction, setExitAction] = useState<NavigationAction | null>(null);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  useLightStatusBar();

  const playing = m.match?.status === 'playing';
  // ✕, the Android back button and the iOS swipe all ask first: leaving is a forfeit.
  usePreventRemove(playing, ({ data }) => setExitAction(data.action));

  // A rematch room I opened that nobody joined is deleted when I leave it.
  // (Also runs when the opponent joins; cancelWaiting does nothing once the match is playing.)
  const hostingRoom = m.phase === 'waiting-start' && m.match?.hostId === uid;
  useEffect(() => {
    if (!hostingRoom) return;
    return () => {
      source.cancelWaiting().catch(() => {});
    };
  }, [hostingRoom, source]);

  function confirmExit() {
    // The leaver never sees the result screen, so their loss is settled here.
    m.leave()
      .then(() => (source.bot ? null : settleMatch(source.id, myself)))
      .catch(() => {});
    if (exitAction) navigation.dispatch(exitAction);
    setExitAction(null);
  }

  const { match, question, me, opp } = m;

  if (match && m.phase === 'finished') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.padded, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.column}>
          <MatchResult match={match} me={myself} bot={source.bot} onClose={leave} />
        </View>
      </ScrollView>
    );
  }

  if (!match || !question || m.phase === 'waiting-start') {
    let body;
    if (m.loading) body = <ActivityIndicator size="large" color={Brand.link} />;
    else if (!match || !question) {
      body = (
        <Text style={styles.message}>
          {m.problem === 'error'
            ? source.bot
              ? 'تعذّر تحميل الأسئلة، تحقق من اتصالك بالإنترنت أو اختر مادة أخرى.'
              : 'تعذّر تحميل المباراة، تحقق من اتصالك بالإنترنت.'
            : 'المباراة غير موجودة.'}
        </Text>
      );
    } else {
      body = (
        <>
          <ActivityIndicator size="large" color={Brand.link} />
          <Text style={styles.waitingTitle}>بانتظار منافسك…</Text>
          {hostingRoom && <Text style={styles.message}>أرسلنا له طلب إعادة التحدّي. إغلاق الشاشة يلغي الطلب.</Text>}
        </>
      );
    }
    return (
      <View style={[styles.screen, styles.padded, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.column, styles.fill]}>
          <Pressable
            onPress={leave}
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <CloseIcon color={Brand.textMuted} size={20} />
          </Pressable>
          <View style={styles.center}>{body}</View>
        </View>
      </View>
    );
  }

  const { phase, index, total, myAnswer, oppAnswer } = m;
  const revealed = phase === 'reveal' || !!myAnswer;
  const oppName = opp?.name ?? 'المنافس';
  const myName = me?.name ?? 'أنت';
  const half = question.choices.every((choice) => choice.length <= SHORT_CHOICE);
  const correctLetter = CHOICE_LETTERS[question.correctIndex];

  let oppStatus;
  if (m.oppAway && !oppAnswer) {
    oppStatus = <PlayerStatus text="انقطع اتصال المنافس…" color={Brand.error} />;
  } else if (oppAnswer === null) {
    oppStatus = phase === 'reveal' ? <PlayerStatus text="لم يُجب" /> : <ThinkingStatus />;
  } else if (oppAnswer === 'hidden') {
    oppStatus = (
      <PlayerStatus
        text="أجاب · تظهر إجابته بعد إجابتك"
        color={Brand.accentBright}
        icon={<LockIcon color={Brand.accentBright} size={13} strokeWidth={2.5} />}
      />
    );
  } else {
    const color = markColor(oppAnswer.correct);
    oppStatus = (
      <PlayerStatus
        text={`اختار ${CHOICE_LETTERS[oppAnswer.choice]} · ${oppAnswer.correct ? 'صحيحة' : 'خاطئة'}`}
        color={color}
        icon={
          <View style={[styles.statusMark, { backgroundColor: color }]}>
            <Mark correct={oppAnswer.correct} size={11} color={Brand.background} />
          </View>
        }
      />
    );
  }

  let myStatus;
  if (phase === 'answering') myStatus = <PlayerStatus text="دورك للإجابة" color={Brand.link} />;
  else if (myAnswer) myStatus = <PlayerStatus text="أجبت" />;
  else myStatus = <PlayerStatus text="لم تُجب" color={Brand.error} />;

  let feedback = null;
  if (myAnswer?.correct) {
    feedback = { good: true, text: m.fastest ? 'إجابة صحيحة · الأسرع' : 'إجابة صحيحة' };
  } else if (myAnswer) {
    feedback = { good: false, text: `إجابة خاطئة · الإجابة الصحيحة ${correctLetter}` };
  } else if (phase === 'reveal') {
    feedback = { good: false, text: `انتهى الوقت · الإجابة الصحيحة ${correctLetter}` };
  }

  const last = index + 1 === total;
  let button;
  if (phase === 'answering') button = 'تأكيد الإجابة';
  else if (phase === 'waiting') button = 'بانتظار المنافس…';
  else if (m.nextIn > 0) button = `${last ? 'النتيجة' : 'السؤال التالي'} خلال ${toArabicDigits(m.nextIn)}…`;
  else button = last ? 'جارٍ إنهاء المباراة…' : 'جارٍ الانتقال…';
  const canConfirm = phase === 'answering' && m.picked !== null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={[styles.column, styles.topBarInner]}>
          <View style={styles.topRow}>
            <Pressable
              onPress={leave}
              accessibilityRole="button"
              accessibilityLabel="مغادرة المباراة"
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <BackIcon color={Brand.text} size={20} />
            </Pressable>
            <View style={styles.titles}>
              <Text style={styles.title} numberOfLines={1}>
                {matchTitle(match, source.bot)}
              </Text>
              <Text style={styles.subtitle}>
                السؤال {toArabicDigits(index + 1)} من {toArabicDigits(total)}
              </Text>
            </View>
            <ScorePill me={m.score.me} opp={m.score.opp} />
          </View>
          <QuestionStrip
            total={total}
            current={index}
            me={me}
            opp={opp}
            oppVisible={m.oppVisible}
            over={phase === 'reveal'}
          />
        </View>
      </View>

      <View style={[styles.column, styles.fill]}>
        <PlayerRow
          name={oppName}
          rating={opp?.rating}
          variant="opponent"
          status={oppStatus}
          clock={m.clocks.opp}
          low={m.clocks.oppLow}
          reaction={m.reactions.opp === null ? null : REACTIONS[m.reactions.opp]}
        />
        {m.canClaimWin && (
          <View style={styles.claim} accessibilityLiveRegion="polite">
            <Text style={styles.claimText}>يبدو أن المنافس غادر.</Text>
            <Pressable
              onPress={m.claimWin}
              accessibilityRole="button"
              style={({ pressed }) => [styles.claimButton, pressed && styles.pressed]}>
              <Text style={styles.claimButtonText}>إنهاء المباراة بفوزك</Text>
            </Pressable>
          </View>
        )}

        {/* Keyed by question, so each one starts scrolled to the top. */}
        <ScrollView key={index} style={styles.fill} contentContainerStyle={styles.body}>
          <View style={styles.questionCard}>
            <Chip label={question.subjectName || 'عام'} tone="indigo" />
            <Text style={styles.questionText}>{question.body}</Text>
          </View>

          <View style={styles.grid} accessibilityRole="radiogroup">
            {question.choices.map((choice, c) => (
              <MatchChoice
                key={c}
                letter={CHOICE_LETTERS[c]}
                text={choice}
                selected={m.picked === c}
                revealed={revealed}
                correct={c === question.correctIndex}
                mine={myAnswer?.choice === c}
                myInitial={myName.charAt(0)}
                opponent={
                  oppAnswer && oppAnswer !== 'hidden' && oppAnswer.choice === c
                    ? { initial: oppName.charAt(0), correct: oppAnswer.correct }
                    : null
                }
                half={half}
                disabled={phase !== 'answering'}
                onPress={() => m.pick(c)}
              />
            ))}
          </View>

          {feedback && (
            <Text
              style={[styles.feedback, feedback.good ? styles.feedbackGood : styles.feedbackBad]}
              accessibilityLiveRegion="polite">
              {feedback.text}
            </Text>
          )}
        </ScrollView>

        <PlayerRow
          name={myName}
          label="أنت"
          rating={me?.rating}
          variant="me"
          status={myStatus}
          clock={m.clocks.me}
          low={m.clocks.meLow}
          reaction={m.reactions.me === null ? null : REACTIONS[m.reactions.me]}
        />
      </View>

      {reactionsOpen && (
        <View style={styles.reactionPicker} accessibilityRole="menu">
          {REACTIONS.map((emoji, i) => (
            <Pressable
              key={emoji}
              onPress={() => {
                m.react(i);
                setReactionsOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`أرسل ${emoji}`}
              style={({ pressed }) => [styles.reactionOption, pressed && styles.pressed]}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14 }]}>
        {/* Keeps the main button centred opposite «تفاعل». */}
        <View style={styles.sideButton} />
        <Pressable
          onPress={m.confirm}
          disabled={!canConfirm}
          accessibilityRole="button"
          accessibilityLabel={button}
          accessibilityState={{ disabled: !canConfirm }}
          style={({ pressed }) => [
            styles.mainButton,
            canConfirm ? styles.mainButtonOn : styles.mainButtonOff,
            pressed && styles.pressed,
          ]}>
          {phase === 'answering' && <CheckIcon color={canConfirm ? Brand.white : Brand.textMuted} size={20} />}
          <Text style={[styles.mainButtonText, !canConfirm && styles.mainButtonTextOff]}>{button}</Text>
        </Pressable>
        <Pressable
          onPress={() => setReactionsOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: reactionsOpen }}
          style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}>
          <ChatIcon color={reactionsOpen ? Brand.link : Brand.textMuted} size={22} />
          <Text style={[styles.sideButtonText, reactionsOpen && { color: Brand.link }]}>تفاعل</Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={exitAction !== null && playing}
        title="مغادرة المباراة؟"
        message={source.bot ? 'ستنتهي جولة التدريب.' : 'ستُحتسب المباراة خسارة لك وفوزاً لمنافسك.'}
        confirmLabel="مغادرة"
        cancelLabel="متابعة اللعب"
        destructive
        onConfirm={confirmExit}
        onCancel={() => setExitAction(null)}
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
  // Phone width on large screens (web), centered.
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  iconButton: {
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
  topBar: {
    backgroundColor: '#111A2E',
    borderBottomWidth: 1,
    borderBottomColor: Brand.surface,
  },
  topBarInner: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titles: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  statusMark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  questionCard: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  questionText: {
    fontSize: 19,
    lineHeight: 32,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  // Room above each row for the players' badges.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    columnGap: 10,
    paddingTop: 12,
  },
  feedback: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: 'hidden',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
  },
  feedbackGood: {
    backgroundColor: 'rgba(16,185,129,0.14)',
    color: Brand.success,
  },
  feedbackBad: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    color: Brand.error,
  },
  claim: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Brand.dangerSoft,
  },
  claimText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.semiBold,
    color: Brand.error,
  },
  claimButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Brand.danger,
  },
  claimButtonText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.bold,
    color: Brand.white,
  },
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: Brand.surface,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  reactionOption: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.background,
  },
  reactionEmoji: {
    fontSize: 24,
    lineHeight: 32,
  },
  sideButton: {
    width: 64,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  sideButtonText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: Brand.surface,
    borderTopWidth: 1,
    borderTopColor: Brand.border,
  },
  mainButton: {
    flex: 1,
    maxWidth: 320,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainButtonOn: {
    backgroundColor: Brand.primary,
    boxShadow: '0 4px 0 #3730A3',
  },
  mainButtonOff: {
    backgroundColor: Brand.border,
  },
  mainButtonText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.white,
  },
  mainButtonTextOff: {
    color: Brand.textMuted,
  },
  waitingTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
    textAlign: 'center',
  },
});
