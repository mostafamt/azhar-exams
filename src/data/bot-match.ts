import { Timestamp } from 'firebase/firestore';

import type { MatchSource } from '@/data/match-source';
import {
  pickWinner,
  PRESETS,
  type Match,
  type MatchAnswer,
  type MatchPlayer,
  type MatchSubject,
  type Me,
  type PresetId,
} from '@/data/matches';
import { fetchRandomQuestions } from '@/data/questions';

export const BOT_ID = 'bot';
export const BOT_NAME = 'الروبوت';
/** How often the bot is right. */
const BOT_ACCURACY = 0.6;

/**
 * «تدرّب ضد الروبوت»: a match that lives only on this phone, played on the same live screen.
 * The bot answers each question after a random delay; nothing is written to Firestore.
 */
export function botSource(me: Me, preset: PresetId, subject: MatchSubject): MatchSource {
  let match: Match | null = null;
  let listener: ((match: Match | null) => void) | null = null;
  let botTimer: ReturnType<typeof setTimeout> | undefined;

  function emit(next: Match) {
    match = next;
    listener?.(next);
  }

  function updatePlayer(current: Match, uid: string, change: Partial<MatchPlayer>): Match {
    return { ...current, players: { ...current.players, [uid]: { ...current.players[uid], ...change } } };
  }

  function answerFor(current: Match, uid: string, index: number, answer: MatchAnswer) {
    const player = current.players[uid];
    if (current.status !== 'playing' || current.current !== index || player.answers[index]) return current;
    return updatePlayer(current, uid, {
      answers: { ...player.answers, [index]: answer },
      score: player.score + (answer.correct ? 1 : 0),
    });
  }

  /** The bot's answer to the current question, somewhere between 25% and 90% of the time. */
  function scheduleBot() {
    clearTimeout(botTimer);
    if (!match || match.status !== 'playing') return;
    const limitMs = match.secondsPerQuestion * 1000;
    const ms = Math.round(limitMs * (0.25 + Math.random() * 0.65));
    const index = match.current;
    botTimer = setTimeout(() => {
      if (!match) return;
      const question = match.questions[index];
      const right = Math.random() < BOT_ACCURACY;
      const wrong = [0, 1, 2, 3].filter((c) => c !== question.correctIndex);
      const choice = right ? question.correctIndex : wrong[Math.floor(Math.random() * wrong.length)];
      emit(answerFor(match, BOT_ID, index, { choice, correct: right, ms }));
    }, ms);
  }

  async function start() {
    const { count, seconds } = PRESETS[preset];
    const questions = await fetchRandomQuestions(count, subject?.id);
    if (questions.length === 0) throw new Error('empty-bank');
    const now = Timestamp.now();
    const player = (name: string): MatchPlayer => ({ name, answers: {}, score: 0, left: false });
    emit({
      id: BOT_ID,
      mode: 'code',
      ranked: false,
      code: null,
      subjectId: subject?.id ?? null,
      subjectName: subject?.name ?? null,
      status: 'playing',
      preset,
      secondsPerQuestion: seconds,
      questions: questions.map(({ id, body, choices, correctIndex, source }) => ({
        id,
        body,
        choices,
        correctIndex,
        subjectName: source?.subjectName ?? null,
      })),
      current: 0,
      questionStartedAt: now,
      hostId: me.uid,
      playerIds: [me.uid, BOT_ID],
      players: { [me.uid]: player(me.name), [BOT_ID]: player(BOT_NAME) },
      createdAt: now,
      startedAt: now,
      finishedAt: null,
      winnerId: null,
      rematchId: null,
    });
    scheduleBot();
  }

  return {
    id: `bot:${preset}:${subject?.id ?? 'mix'}`,
    bot: true,
    subscribe(onMatch, onError) {
      listener = onMatch;
      if (match) onMatch(match);
      else start().catch(onError);
      return () => {
        listener = null;
        clearTimeout(botTimer);
      };
    },
    async answer(uid, index, answer) {
      if (match) emit(answerFor(match, uid, index, answer));
    },
    async advance(from) {
      if (!match || match.status !== 'playing' || match.current !== from) return;
      if (from + 1 >= match.questions.length) {
        clearTimeout(botTimer);
        emit({ ...match, status: 'finished', finishedAt: Timestamp.now(), winnerId: pickWinner(match) });
      } else {
        emit({ ...match, current: from + 1, questionStartedAt: Timestamp.now() });
        scheduleBot();
      }
    },
    async leave(uid) {
      if (!match || match.status !== 'playing') return;
      clearTimeout(botTimer);
      const left = updatePlayer(match, uid, { left: true });
      emit({ ...left, status: 'finished', finishedAt: Timestamp.now(), winnerId: BOT_ID });
    },
    async heartbeat() {},
    async react(uid, emoji) {
      if (match) emit(updatePlayer(match, uid, { reaction: { emoji, at: Timestamp.now() } }));
    },
    async claimWin() {},
    async cancelWaiting() {},
  };
}
