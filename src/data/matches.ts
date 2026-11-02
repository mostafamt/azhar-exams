import {
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { fetchRandomQuestions, type Question } from '@/data/questions';
import { db } from '@/lib/firebase';

/**
 * 1v1 matches in lockstep: both players are always on `current` (docs/match-plan.md).
 * The rules in ../azhar-exams-dashboard/firestore.rules check every write below, including
 * that an answer is for the current question, in time, and graded against `correctIndex`.
 */

export const PRESETS = {
  short: { label: '5 أسئلة', count: 5, seconds: 20 },
  medium: { label: '10 أسئلة', count: 10, seconds: 20 },
  long: { label: '15 سؤال', count: 15, seconds: 30 },
} as const;
export type PresetId = keyof typeof PRESETS;

/** Waiting matches older than this are ignored by search. */
const SEARCH_WINDOW_MS = 2 * 60_000;
/** Abandoned waiting matches are deleted by the TTL policy on `expireAt` after this. */
const WAITING_TTL_MS = 60 * 60_000;

export type MatchAnswer = { choice: number; correct: boolean; ms: number };

export type MatchPlayer = {
  name: string;
  /** Keyed by question index; a missing key means no answer (counts as wrong). */
  answers: Record<string, MatchAnswer>;
  score: number;
  left: boolean;
};

export type MatchQuestion = Pick<Question, 'id' | 'body' | 'choices' | 'correctIndex'> & {
  subjectName: string | null;
};

export type Match = {
  id: string;
  mode: 'random' | 'code';
  code: string | null;
  status: 'waiting' | 'playing' | 'finished';
  preset: PresetId;
  secondsPerQuestion: number;
  questions: MatchQuestion[];
  /** The question both players are on. */
  current: number;
  /** Server time `current` started; the rules time answers against it. */
  questionStartedAt: Timestamp | null;
  hostId: string;
  playerIds: string[];
  players: Record<string, MatchPlayer>;
  createdAt: Timestamp | null;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  /** Null when finished means a draw. */
  winnerId: string | null;
  rematchId: string | null;
};

export type Me = { uid: string; name: string };

const matches = collection(db, 'matches');

export function toMatch(snapshot: DocumentSnapshot): Match {
  return { id: snapshot.id, ...(snapshot.data() as Omit<Match, 'id'>) };
}

export function opponentId(match: Match, uid: string) {
  return match.playerIds.find((id) => id !== uid) ?? null;
}

/** Both players answered the current question. */
export function bothAnswered(match: Match) {
  return match.playerIds.length === 2 && match.playerIds.every((id) => match.players[id]?.answers[match.current]);
}

function newPlayer(name: string): MatchPlayer {
  return { name, answers: {}, score: 0, left: false };
}

// No 0/O, 1/I/L: codes are read aloud and typed by hand.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

function queueKey(preset: PresetId) {
  return `mix:${preset}`;
}

/** Creates a waiting match with its questions already picked; returns its id. */
export async function createMatch(me: Me, mode: Match['mode'], preset: PresetId) {
  const { count, seconds } = PRESETS[preset];
  const questions = await fetchRandomQuestions(count);
  if (questions.length === 0) throw new Error('empty-bank');

  const ref = doc(matches);
  await setDoc(ref, {
    mode,
    code: mode === 'code' ? newCode() : null,
    queueKey: mode === 'random' ? queueKey(preset) : null,
    subjectId: null,
    preset,
    secondsPerQuestion: seconds,
    questions: questions.map(({ id, body, choices, correctIndex, source }) => ({
      id,
      body,
      choices,
      correctIndex,
      subjectName: source?.subjectName ?? null,
    })),
    status: 'waiting',
    current: 0,
    questionStartedAt: null,
    hostId: me.uid,
    playerIds: [me.uid],
    players: { [me.uid]: newPlayer(me.name) },
    createdAt: serverTimestamp(),
    startedAt: null,
    finishedAt: null,
    winnerId: null,
    rematchId: null,
    expireAt: Timestamp.fromMillis(Date.now() + WAITING_TTL_MS),
  });
  return ref.id;
}

/** Joins a waiting match and starts question 0; false if someone else got there first. */
export function tryJoin(ref: DocumentReference, me: Me) {
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return false;
    const match = toMatch(snapshot);
    if (match.status !== 'waiting' || match.playerIds.length !== 1 || match.hostId === me.uid) return false;
    tx.update(ref, {
      status: 'playing',
      playerIds: [...match.playerIds, me.uid],
      [`players.${me.uid}`]: newPlayer(me.name),
      startedAt: serverTimestamp(),
      questionStartedAt: serverTimestamp(),
      expireAt: deleteField(),
    });
    return true;
  });
}

/** Waiting random matches in the same queue, oldest first; `olderThan` limits it to those before mine. */
export async function findWaiting(preset: PresetId, olderThan?: Timestamp) {
  const since = Timestamp.fromMillis(Date.now() - SEARCH_WINDOW_MS);
  const snapshot = await getDocs(
    query(
      matches,
      where('queueKey', '==', queueKey(preset)),
      where('status', '==', 'waiting'),
      where('createdAt', '>', since),
      ...(olderThan ? [where('createdAt', '<', olderThan)] : []),
      orderBy('createdAt'),
      limit(5),
    ),
  );
  return snapshot.docs;
}

/** Joins the oldest waiting match, or creates one. `joined` tells the caller whether it's already playing. */
export async function findOrCreate(me: Me, preset: PresetId) {
  for (const waiting of await findWaiting(preset)) {
    if (waiting.data().hostId === me.uid) continue;
    if (await tryJoin(waiting.ref, me)) return { matchId: waiting.id, joined: true };
  }
  return { matchId: await createMatch(me, 'random', preset), joined: false };
}

/** Joins a room by its code; null if there's no such waiting room or it just filled up. */
export async function joinByCode(me: Me, code: string) {
  const snapshot = await getDocs(
    query(matches, where('code', '==', code.trim().toUpperCase()), where('status', '==', 'waiting'), limit(1)),
  );
  const waiting = snapshot.docs[0];
  if (!waiting || !(await tryJoin(waiting.ref, me))) return null;
  return waiting.id;
}

/** Deletes my waiting match; does nothing once someone has joined. */
export function cancelWaiting(matchId: string) {
  const ref = doc(matches, matchId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists() && snapshot.data().status === 'waiting') tx.delete(ref);
  });
}

/** My answer to the current question. The rules reject it if it's late, repeated or not for `current`. */
export function submitAnswer(matchId: string, uid: string, index: number, answer: MatchAnswer) {
  return updateDoc(doc(matches, matchId), {
    [`players.${uid}.answers.${index}`]: { ...answer, ms: Math.round(answer.ms) },
    [`players.${uid}.score`]: increment(answer.correct ? 1 : 0),
  });
}

/** A player who left loses; otherwise the higher score wins, and equal scores draw (null). */
export function pickWinner(match: Match) {
  const [a, b] = match.playerIds.map((id) => ({ id, ...match.players[id] }));
  if (!a || !b) return null;
  if (a.left !== b.left) return a.left ? b.id : a.id;
  if (a.score === b.score) return null;
  return a.score > b.score ? a.id : b.id;
}

/**
 * Moves both players from question `from` to the next one, or finishes after the last.
 * Both clients call it; whoever comes second finds `current` already moved and does nothing.
 */
export function advance(matchId: string, from: number) {
  const ref = doc(matches, matchId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return;
    const match = toMatch(snapshot);
    if (match.status !== 'playing' || match.current !== from) return;
    if (from + 1 >= match.questions.length) {
      tx.update(ref, { status: 'finished', finishedAt: serverTimestamp(), winnerId: pickWinner(match) });
    } else {
      tx.update(ref, { current: from + 1, questionStartedAt: serverTimestamp() });
    }
  });
}

/** Forfeit: one write that marks me as left and gives the opponent the win. */
export function leaveMatch(matchId: string, uid: string, opponent: string) {
  return updateDoc(doc(matches, matchId), {
    [`players.${uid}.left`]: true,
    status: 'finished',
    finishedAt: serverTimestamp(),
    winnerId: opponent,
  });
}

/** Points an ended match at its rematch; false if the other player already set one. */
export function setRematch(matchId: string, rematchId: string) {
  const ref = doc(matches, matchId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().rematchId) return false;
    tx.update(ref, { rematchId });
    return true;
  });
}
