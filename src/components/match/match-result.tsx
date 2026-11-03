import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Mark } from '@/components/match/mark';
import { ChoiceButton, type ChoiceState } from '@/components/quiz/choice-button';
import { BoltIcon, CloseIcon, RefreshIcon, TrendIcon, TrophyIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import {
  opponentId,
  playerStats,
  PRESETS,
  rematch,
  type Match,
  type MatchAnswer,
  type Me,
  type PlayerStats,
} from '@/data/matches';
import { CHOICE_LETTERS } from '@/data/questions';
import { settleMatch, type Settlement } from '@/data/ratings';
import { toArabicDigits } from '@/utils/arabic';

/** After this, «إعادة التحدّي» is gone: the other player has long left the result screen. */
const REMATCH_WINDOW_MS = 30 * 60_000;

const HERO = {
  win: { title: 'فوز!', color: Brand.accent },
  loss: { title: 'خسارة', color: Brand.textMuted },
  draw: { title: 'تعادل', color: Brand.link },
};

/** «بفارق سؤالين»: Arabic counts 1, 2, 3–10 and 11+ differently. */
function questionsGap(n: number) {
  if (n === 1) return 'سؤال واحد';
  if (n === 2) return 'سؤالين';
  if (n <= 10) return `${toArabicDigits(n)} أسئلة`;
  return `${toArabicDigits(n)} سؤالاً`;
}

function formatSeconds(ms: number | null) {
  return ms === null ? '–' : `${Math.round(ms / 1000)}s`;
}

type Props = {
  match: Match;
  me: Me;
  /** Practice against the bot: no rating, and «إعادة التحدّي» starts another practice match. */
  bot?: boolean;
  /** Leave the screen (✕). */
  onClose: () => void;
};

/** The end of a match (7c · Match Result, mapping in docs/match-plan.md §7). */
export function MatchResult({ match, me, bot = false, onClose }: Props) {
  const [rematchState, setRematchState] = useState<'idle' | 'busy' | 'gone'>('idle');
  const [reviewOpen, setReviewOpen] = useState(false);
  // What this match added to my rating and XP; null if it was settled before (e.g. from history).
  const [settlement, setSettlement] = useState<Settlement | null>(null);

  const matchId = match.id;
  const settleable = !bot && match.status === 'finished' && !match.players[me.uid]?.rated;
  useEffect(() => {
    if (!settleable || !me.uid || !me.name) return;
    settleMatch(matchId, { uid: me.uid, name: me.name })
      .then((result) => result && setSettlement(result))
      .catch((e) => {
        if (__DEV__) console.warn('settleMatch failed', e);
      });
  }, [settleable, matchId, me.uid, me.name]);

  const oppId = opponentId(match, me.uid);
  const mine = match.players[me.uid];
  const theirs = oppId ? match.players[oppId] : undefined;
  const oppName = theirs?.name ?? 'المنافس';
  const result = match.winnerId === null ? 'draw' : match.winnerId === me.uid ? 'win' : 'loss';
  const hero = HERO[result];
  const total = match.questions.length;
  const myScore = mine?.score ?? 0;
  const oppScore = theirs?.score ?? 0;

  let subtitle;
  if (theirs?.left) subtitle = `انسحب ${oppName} من المباراة`;
  else if (mine?.left) subtitle = 'انسحبت من المباراة';
  else if (result === 'draw') subtitle = 'نفس عدد الإجابات الصحيحة';
  else if (result === 'win') subtitle = `تفوّقت على ${oppName} بفارق ${questionsGap(myScore - oppScore)}`;
  else if (oppScore - myScore === 1) subtitle = 'قريبة جداً — جرّب مباراة ثأر';
  else subtitle = `تفوّق عليك ${oppName} بفارق ${questionsGap(oppScore - myScore)}`;

  const myStats = playerStats(match, me.uid);
  const oppStats = oppId ? playerStats(match, oppId) : null;
  const rows: { label: string; value: (stats: PlayerStats) => string }[] = [
    { label: 'إجابات صحيحة', value: (stats) => `${stats.correct} / ${total}` },
    { label: 'متوسط زمن الإجابة', value: (stats) => formatSeconds(stats.averageMs) },
    { label: 'أطول سلسلة صحيحة', value: (stats) => String(stats.longestStreak) },
    { label: 'الأسرع في', value: (stats) => String(stats.fastest) },
  ];

  const finishedAt = match.finishedAt?.toMillis() ?? 0;
  // Read once: the window only matters for old matches opened from «آخر المباريات».
  const [openedAt] = useState(() => Date.now());
  const rematchOpen = bot || (!!oppId && rematchState !== 'gone' && openedAt - finishedAt < REMATCH_WINDOW_MS);
  // The opponent asked first. (If I had, I'd already be on the new match.)
  const invited = !bot && !!match.rematchId && rematchState === 'idle';

  async function startRematch() {
    if (bot) {
      router.replace({
        pathname: '/match/bot',
        params: { preset: match.preset, subjectId: match.subjectId ?? '', subjectName: match.subjectName ?? '' },
      });
      return;
    }
    if (rematchState !== 'idle') return;
    setRematchState('busy');
    try {
      const outcome = await rematch(match, me);
      if ('matchId' in outcome) router.replace({ pathname: '/match/[id]', params: { id: outcome.matchId } });
      else setRematchState('gone');
    } catch (e) {
      if (__DEV__) console.warn('rematch failed', e);
      setRematchState('idle');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="إغلاق"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <CloseIcon color={Brand.text} size={20} />
        </Pressable>
        <Text style={styles.headerText}>
          {match.subjectName || 'متنوع'} · {PRESETS[match.preset].label} ·{' '}
          {bot ? 'تدريب' : match.ranked ? 'مصنّفة' : 'ودية'}
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.hero} accessibilityLiveRegion="polite">
          <TrophyIcon color={hero.color} size={40} />
          <Text style={[styles.heroTitle, { color: hero.color }]} accessibilityRole="header">
            {hero.title}
          </Text>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.players}>
          <Player
            name={mine?.name ?? 'أنت'}
            label="أنت"
            mine
            ring={result === 'win' ? Brand.accent : Brand.primaryBright}
          />
          <View style={styles.bigScore} accessible accessibilityLabel={`النتيجة: أنت ${myScore}، المنافس ${oppScore}`}>
            <Text style={[styles.bigScoreText, { color: Brand.link }]}>{myScore}</Text>
            <Text style={[styles.bigScoreText, styles.bigScoreDash]}>–</Text>
            <Text style={[styles.bigScoreText, { color: Brand.accentBright }]}>{oppScore}</Text>
          </View>
          <Player name={oppName} ring={result === 'loss' ? Brand.accent : Brand.border} />
        </View>
        {settlement && <SettlementChips settlement={settlement} ranked={!!match.ranked} />}
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.cellLabel, styles.headText]} />
          <Text style={[styles.cell, styles.headText]}>أنت</Text>
          <Text style={[styles.cell, styles.headText]}>المنافس</Text>
        </View>
        {rows.map((row, i) => (
          <View key={row.label} style={[styles.tableRow, i < rows.length - 1 && styles.tableDivider]}>
            <Text style={styles.cellLabel}>{row.label}</Text>
            <Text style={[styles.cell, styles.cellMine]}>{row.value(myStats)}</Text>
            <Text style={[styles.cell, styles.cellOpp]}>{oppStats ? row.value(oppStats) : '–'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {rematchOpen && invited && (
          <Text style={styles.invite} accessibilityLiveRegion="polite">
            {oppName} يطلب إعادة التحدّي
          </Text>
        )}
        {rematchState === 'gone' && <Text style={styles.gone}>لم يعد التحدّي متاحاً، ابدأ مباراة جديدة.</Text>}
        <View style={styles.actionRow}>
          {rematchOpen && (
            <Pressable
              onPress={startRematch}
              disabled={rematchState === 'busy'}
              accessibilityRole="button"
              accessibilityLabel={invited ? 'انضم إلى إعادة التحدّي' : 'إعادة التحدّي'}
              accessibilityState={{ busy: rematchState === 'busy' }}
              style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}>
              {rematchState === 'busy' ? (
                <ActivityIndicator color={Brand.white} />
              ) : (
                <>
                  <RefreshIcon color={Brand.white} size={18} />
                  <Text style={styles.primaryText}>{invited ? 'انضم' : 'إعادة التحدّي'}</Text>
                </>
              )}
            </Pressable>
          )}
          <Pressable
            // Back to the lobby if it's under this screen (opened from «آخر المباريات»), else replace.
            onPress={() => router.dismissTo('/match')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.outline, pressed && styles.pressed]}>
            <Text style={styles.outlineText}>مباراة جديدة</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => setReviewOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: reviewOpen }}
          style={({ pressed }) => [styles.reviewToggle, pressed && styles.pressed]}>
          <Text style={styles.link}>{reviewOpen ? 'إخفاء المراجعة' : 'مراجعة الأسئلة والحلول'}</Text>
        </Pressable>
      </View>

      {reviewOpen &&
        match.questions.map((question, k) => {
          const myAnswer = mine?.answers[k];
          const oppAnswer = theirs?.answers[k];
          return (
            <View key={`${question.id}-${k}`} style={styles.review}>
              <Text style={styles.reviewQuestion}>
                {toArabicDigits(k + 1)}. {question.body}
              </Text>
              <View style={styles.reviewAnswers}>
                <AnswerLine who="أنت" answer={myAnswer} />
                <AnswerLine who={oppName} answer={oppAnswer} />
              </View>
              {question.choices.map((choice, c) => (
                <ChoiceButton
                  key={c}
                  letter={CHOICE_LETTERS[c]}
                  text={choice}
                  state={choiceState(question.correctIndex, myAnswer?.choice, c)}
                />
              ))}
            </View>
          );
        })}
    </View>
  );
}

/** «+12 → 1,252» and «+60 XP» (7c). The rating chip is for ranked matches only. */
function SettlementChips({ settlement, ranked }: { settlement: Settlement; ranked: boolean }) {
  const delta = settlement.rating - settlement.ratingBefore;
  const tone = delta > 0 ? chipTones.up : delta < 0 ? chipTones.down : chipTones.even;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return (
    <View style={styles.chips}>
      {ranked && (
        <View style={[styles.chip, { backgroundColor: tone.backgroundColor }]}>
          <TrendIcon color={tone.color} size={16} />
          <Text style={[styles.chipText, { color: tone.color }]}>
            {`\u2066${sign}${Math.abs(delta)}  →  ${settlement.rating.toLocaleString('en-US')}\u2069`}
          </Text>
        </View>
      )}
      <View style={[styles.chip, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
        <BoltIcon color={Brand.accentBright} size={16} />
        <Text style={[styles.chipText, { color: Brand.accentBright }]}>{`\u2066+${settlement.xp} XP\u2069`}</Text>
      </View>
    </View>
  );
}

const chipTones = {
  up: { backgroundColor: 'rgba(16,185,129,0.14)', color: Brand.success },
  down: { backgroundColor: 'rgba(239,68,68,0.12)', color: Brand.error },
  even: { backgroundColor: 'rgba(148,163,184,0.14)', color: '#CBD5E1' },
};

function choiceState(correctIndex: number, mine: number | undefined, choice: number): ChoiceState {
  if (choice === correctIndex) return 'correct';
  if (choice === mine) return 'wrong';
  return 'idle';
}

function AnswerLine({ who, answer }: { who: string; answer: MatchAnswer | undefined }) {
  const text = answer ? `${who}: ${CHOICE_LETTERS[answer.choice]}` : `${who}: لم يُجب`;
  return (
    <View style={styles.answerLine}>
      <Mark correct={answer ? answer.correct : false} size={14} />
      <Text style={styles.answerText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function Player({ name, label, mine, ring }: { name: string; label?: string; mine?: boolean; ring: string }) {
  return (
    <View style={styles.player}>
      <View style={[styles.avatar, mine ? styles.avatarMine : styles.avatarOpp, { borderColor: ring }]}>
        <Text style={[styles.avatarText, { color: mine ? Brand.primaryPale : '#FDE68A' }]}>{name.charAt(0)}</Text>
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {label ?? name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
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
  heroCard: {
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 18,
    paddingVertical: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 46,
    fontFamily: Fonts.extraBold,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  players: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
  },
  player: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMine: {
    backgroundColor: Brand.primaryDeep,
  },
  avatarOpp: {
    backgroundColor: '#78350F',
  },
  avatarText: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: Fonts.extraBold,
  },
  playerName: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  bigScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bigScoreText: {
    fontSize: 40,
    lineHeight: 52,
    fontFamily: Fonts.extraBold,
  },
  bigScoreDash: {
    fontSize: 28,
    color: '#475569',
  },
  chips: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 14,
  },
  chipText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
  },
  table: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tableHead: {
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  tableDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#263244',
  },
  headText: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  cellLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  cell: {
    width: 72,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  cellMine: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  cellOpp: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: '#CBD5E1',
  },
  actions: {
    gap: 10,
  },
  invite: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.accentBright,
    textAlign: 'center',
  },
  gone: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.error,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: Brand.primary,
    boxShadow: '0 4px 0 #3730A3',
  },
  primaryText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.white,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  outlineText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  reviewToggle: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
  review: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  reviewQuestion: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  reviewAnswers: {
    flexDirection: 'row',
    gap: 16,
  },
  answerLine: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  answerText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
  },
});
