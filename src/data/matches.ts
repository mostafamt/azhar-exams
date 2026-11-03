import {
  collection,
  doc,
  getDoc,
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
/** Rooms waiting longer than this are treated as abandoned by «انضم بكود». */
const ROOM_WINDOW_MS = 30 * 60_000;

export type MatchAnswer = { choice: number; correct: boolean; ms: number };

export type MatchPlayer = {
  name: string;
  /** Keyed by question index; a missing key means no answer (counts as wrong). */
  answers: Record<string, MatchAnswer>;
  score: number;
  left: boolean;
  /** Rating when the match started; ranked matches only. */
  rating?: number;
  /** Presence heartbeat (server time), every HEARTBEAT_MS while on the match screen. */
  seenAt?: Timestamp | null;
  /** Last «تفاعل»: an index into REACTIONS. */
  reaction?: { emoji: number; at: Timestamp | null };
  /** This result was added to my rating (ratings.ts). */
  rated?: boolean;
};

/** «تفاعل»: what a player can send during a match. */
export const REACTIONS = ['👏', '🔥', '😮', '😅', '💪', '🤝'];

export type MatchQuestion = Pick<Question, 'id' | 'body' | 'choices' | 'correctIndex'> & {
  subjectName: string | null;
};

export type Match = {
  id: string;
  mode: 'random' | 'code';
  /** Random matches are ranked; room codes and rematches are friendly. */
  ranked?: boolean;
  code: string | null;
  /** Null: «متنوع», the whole bank. */
  subjectId: string | null;
  subjectName?: string | null;
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

/** `rating` is only needed for ranked (random) matches. */
export type Me = { uid: string; name: string; rating?: number };

/** «المادة»: null is «متنوع». */
export type MatchSubject = { id: string; name: string } | null;

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

function newPlayer(me: Me, ranked: boolean): MatchPlayer {
  const player: MatchPlayer = { name: me.name, answers: {}, score: 0, left: false };
  if (ranked && me.rating !== undefined) player.rating = Math.round(me.rating);
  return player;
}

// No 0/O, 1/I/L: codes are read aloud and typed by hand.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function newCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

function queueKey(preset: PresetId, subject: MatchSubject) {
  return `${subject?.id ?? 'mix'}:${preset}`;
}

/** Creates a waiting match with its questions already picked; returns its id. */
export async function createMatch(me: Me, mode: Match['mode'], preset: PresetId, subject: MatchSubject = null) {
  const { count, seconds } = PRESETS[preset];
  const ranked = mode === 'random';
  const questions = await fetchRandomQuestions(count, subject?.id);
  if (questions.length === 0) throw new Error('empty-bank');
  // A search or room from before (e.g. the app was killed while waiting) would otherwise stay forever.
  await deleteMyWaiting(me.uid).catch(() => {});

  const ref = doc(matches);
  await setDoc(ref, {
    mode,
    code: mode === 'code' ? newCode() : null,
    queueKey: mode === 'random' ? queueKey(preset, subject) : null,
    ranked,
    subjectId: subject?.id ?? null,
    subjectName: subject?.name ?? null,
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
    players: { [me.uid]: newPlayer(me, ranked) },
    createdAt: serverTimestamp(),
    startedAt: null,
    finishedAt: null,
    winnerId: null,
    rematchId: null,
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
      [`players.${me.uid}`]: newPlayer(me, !!match.ranked),
      startedAt: serverTimestamp(),
      questionStartedAt: serverTimestamp(),
    });
    return true;
  });
}

/** Waiting random matches in the same queue, oldest first; `olderThan` limits it to those before mine. */
export async function findWaiting(preset: PresetId, subject: MatchSubject, olderThan?: Timestamp) {
  const since = Timestamp.fromMillis(Date.now() - SEARCH_WINDOW_MS);
  const snapshot = await getDocs(
    query(
      matches,
      where('queueKey', '==', queueKey(preset, subject)),
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
export async function findOrCreate(me: Me, preset: PresetId, subject: MatchSubject) {
  for (const waiting of await findWaiting(preset, subject)) {
    if (waiting.data().hostId === me.uid) continue;
    if (await tryJoin(waiting.ref, me)) return { matchId: waiting.id, joined: true };
  }
  return { matchId: await createMatch(me, 'random', preset, subject), joined: false };
}

/**
 * The race fix (docs/match-plan.md §4.1): while I wait in `mineId`, join an older waiting match and
 * delete mine in one transaction. Nothing happens if someone joined mine meanwhile, so nobody is
 * left alone in a match. The newer search always joins the older one, so two can't swap.
 */
export function joinOlder(mineId: string, older: DocumentReference, me: Me) {
  const mineRef = doc(matches, mineId);
  return runTransaction(db, async (tx) => {
    const mine = await tx.get(mineRef);
    const other = await tx.get(older);
    if (!mine.exists() || mine.data().status !== 'waiting' || !other.exists()) return false;
    const match = toMatch(other);
    if (match.status !== 'waiting' || match.playerIds.length !== 1 || match.hostId === me.uid) return false;
    tx.update(older, {
      status: 'playing',
      playerIds: [...match.playerIds, me.uid],
      [`players.${me.uid}`]: newPlayer(me, !!match.ranked),
      startedAt: serverTimestamp(),
      questionStartedAt: serverTimestamp(),
    });
    tx.delete(mineRef);
    return true;
  });
}

export type JoinResult =
  | { matchId: string }
  /** not-found: no waiting room has this code; own-room: the same account opened it. */
  | { error: 'not-found' | 'expired' | 'own-room' | 'taken' };

/** Joins a room by its code. */
export async function joinByCode(me: Me, code: string): Promise<JoinResult> {
  const snapshot = await getDocs(
    query(matches, where('code', '==', code.trim().toUpperCase()), where('status', '==', 'waiting'), limit(1)),
  );
  const waiting = snapshot.docs[0];
  if (!waiting) return { error: 'not-found' };
  if (waiting.data().hostId === me.uid) return { error: 'own-room' };
  const createdAt = waiting.data().createdAt as Timestamp | null | undefined;
  if (!createdAt || createdAt.toMillis() < Date.now() - ROOM_WINDOW_MS) return { error: 'expired' };
  if (!(await tryJoin(waiting.ref, me))) return { error: 'taken' };
  return { matchId: waiting.id };
}

/** Deletes my waiting match; does nothing once someone has joined. False means it's a match now. */
export function cancelWaiting(matchId: string) {
  const ref = doc(matches, matchId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return true;
    if (snapshot.data().status !== 'waiting') return false;
    tx.delete(ref);
    return true;
  });
}

/**
 * Deletes waiting matches I left behind. Firestore TTL needs billing, so abandoned searches are
 * cleaned up here instead; search ignores them anyway (SEARCH_WINDOW_MS, ROOM_WINDOW_MS).
 */
async function deleteMyWaiting(uid: string) {
  const snapshot = await getDocs(query(matches, where('hostId', '==', uid), where('status', '==', 'waiting')));
  await Promise.all(snapshot.docs.map((waiting) => cancelWaiting(waiting.id)));
}

/** My answer to the current question. The rules reject it if it's late, repeated or not for `current`. */
export function submitAnswer(matchId: string, uid: string, index: number, answer: MatchAnswer) {
  return updateDoc(doc(matches, matchId), {
    [`players.${uid}.answers.${index}`]: { ...answer, ms: Math.round(answer.ms) },
    [`players.${uid}.score`]: increment(answer.correct ? 1 : 0),
  });
}

/** Total time spent on the questions a player got right: the tiebreak, lower is better. */
export function correctTimeMs(player: MatchPlayer) {
  return Object.values(player.answers).reduce((sum, answer) => sum + (answer.correct ? answer.ms : 0), 0);
}

/**
 * A player who left loses; otherwise the higher score wins. Equal scores go to whoever answered
 * their correct ones faster in total, and only a full tie (e.g. 0 – 0) is a draw (null).
 */
export function pickWinner(match: Match) {
  const [a, b] = match.playerIds.map((id) => ({ id, ...match.players[id] }));
  if (!a || !b) return null;
  if (a.left !== b.left) return a.left ? b.id : a.id;
  if (a.score !== b.score) return a.score > b.score ? a.id : b.id;
  const aMs = correctTimeMs(a);
  const bMs = correctTimeMs(b);
  if (aMs === bMs) return null;
  return aMs < bMs ? a.id : b.id;
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

/** Presence: «I'm still here». The opponent shows «انقطع الاتصال» when these stop. */
export function heartbeat(matchId: string, uid: string) {
  return updateDoc(doc(matches, matchId), { [`players.${uid}.seenAt`]: serverTimestamp() });
}

/** «تفاعل»: shows REACTIONS[emoji] to both players for a moment. The rules allow one every 2 s. */
export function sendReaction(matchId: string, uid: string, emoji: number) {
  return updateDoc(doc(matches, matchId), { [`players.${uid}.reaction`]: { emoji, at: serverTimestamp() } });
}

/** The opponent vanished: the rules allow this once they've sent no heartbeat for 45 s. */
export function claimWin(matchId: string, uid: string) {
  return updateDoc(doc(matches, matchId), { status: 'finished', finishedAt: serverTimestamp(), winnerId: uid });
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

export type RematchResult = { matchId: string } | { error: 'gone' };

/** Joins a rematch room, or opens it again if it's my own; 'gone' once it's cancelled or taken. */
async function joinRematch(matchId: string, me: Me): Promise<RematchResult> {
  const ref = doc(matches, matchId);
  try {
    // A deleted room, or one two other players are in, can't be read: both mean it's gone.
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return { error: 'gone' };
    const match = toMatch(snapshot);
    if (match.playerIds.includes(me.uid)) return match.status === 'finished' ? { error: 'gone' } : { matchId };
    return (await tryJoin(ref, me)) ? { matchId } : { error: 'gone' };
  } catch {
    return { error: 'gone' };
  }
}

/**
 * «إعادة التحدّي» (docs/match-plan.md §6.6): joins the opponent's rematch if there is one, otherwise
 * opens a room with the same preset and links it. If both tap at once, the second one joins the first.
 */
export async function rematch(finished: Match, me: Me): Promise<RematchResult> {
  if (finished.rematchId) return joinRematch(finished.rematchId, me);
  const subject = finished.subjectId ? { id: finished.subjectId, name: finished.subjectName ?? '' } : null;
  const matchId = await createMatch(me, 'code', finished.preset, subject);
  if (await setRematch(finished.id, matchId)) return { matchId };

  await cancelWaiting(matchId).catch(() => {});
  const fresh = await getDoc(doc(matches, finished.id));
  const theirs = fresh.data()?.rematchId as string | null | undefined;
  return theirs ? joinRematch(theirs, me) : { error: 'gone' };
}

export type PlayerStats = {
  correct: number;
  /** Average answer time in ms over the answered questions; null if none. */
  averageMs: number | null;
  longestStreak: number;
  /** Questions this player got right faster than the other (or alone). */
  fastest: number;
};

/** The result screen's stats table (docs/match-plan.md §7). */
export function playerStats(match: Match, uid: string): PlayerStats {
  const mine = match.players[uid]?.answers ?? {};
  const otherId = opponentId(match, uid);
  const theirs = (otherId && match.players[otherId]?.answers) || {};
  let streak = 0;
  let longestStreak = 0;
  let fastest = 0;
  const times: number[] = [];

  match.questions.forEach((_, k) => {
    const answer = mine[k];
    const other = theirs[k];
    if (answer) times.push(answer.ms);
    streak = answer?.correct ? streak + 1 : 0;
    longestStreak = Math.max(longestStreak, streak);
    if (answer?.correct && !(other?.correct && other.ms < answer.ms)) fastest++;
  });

  return {
    correct: Object.values(mine).filter((answer) => answer.correct).length,
    averageMs: times.length ? times.reduce((sum, ms) => sum + ms, 0) / times.length : null,
    longestStreak,
    fastest,
  };
}

/** My last finished matches, newest first («آخر المباريات»). */
export function recentMatchesQuery(uid: string, count = 3) {
  return query(
    matches,
    where('playerIds', 'array-contains', uid),
    where('status', '==', 'finished'),
    orderBy('finishedAt', 'desc'),
    limit(count),
  );
}
