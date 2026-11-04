import {
  collection,
  doc,
  getCountFromServer,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';

import { opponentId, toMatch, type Me } from '@/data/matches';
import { db } from '@/lib/firebase';
import { currentWeekId, weekIdAt } from '@/utils/week';

/**
 * Match ratings and XP, public for «لوحة الصدارة» (docs/match-plan.md §9). The app settles them
 * itself after each match; ../azhar-exams-dashboard/firestore.rules bounds every change and makes
 * sure each match counts once. Good enough for an educational app.
 */

export const START_RATING = 1000;
/** How fast ratings move: the most one match can change them by. */
const K = 32;
const XP = { win: 60, draw: 35, loss: 20 };

export type PlayerRating = {
  uid: string;
  name: string;
  rating: number;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  /** League week this player last earned XP in (utils/week.ts); missing before leagues shipped. */
  weekId?: number;
  /** XP earned in `weekId` (docs/leagues-plan.md). */
  weekXp?: number;
};

/** What one match added, for the chips on the result screen. */
export type Settlement = { ratingBefore: number; rating: number; xp: number };

const ratings = collection(db, 'ratings');

export function toRating(snapshot: DocumentSnapshot): PlayerRating | null {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid: snapshot.id,
    name: data.name,
    rating: data.rating,
    xp: data.xp,
    wins: data.wins,
    losses: data.losses,
    draws: data.draws,
    weekId: data.weekId,
    weekXp: data.weekXp,
  };
}

/** XP earned this week; 0 when the last XP was in an earlier week. */
export function weekXpIn(rating: PlayerRating | null, weekId: number) {
  return rating?.weekId === weekId ? (rating.weekXp ?? 0) : 0;
}

export function ratingRef(uid: string) {
  return doc(ratings, uid);
}

export function leaderboardQuery(count = 20) {
  return query(ratings, orderBy('rating', 'desc'), limit(count));
}

/** «الأوائل»: this week's top players by weekly XP (index: ratings weekId ASC, weekXp DESC). */
export function weeklyLeaderboardQuery(weekId: number, count = 50) {
  return query(ratings, where('weekId', '==', weekId), orderBy('weekXp', 'desc'), limit(count));
}

/**
 * My rank this week: players with more weekly XP, plus one, so equal XP shares a rank
 * («1, 2, 2, 4»). A count query costs about one read per 1,000 players.
 */
export async function weeklyRank(weekId: number, weekXp: number) {
  const ahead = await getCountFromServer(
    query(ratings, where('weekId', '==', weekId), where('weekXp', '>', weekXp))
  );
  return ahead.data().count + 1;
}

/** Elo: the change for a result of 1 (win), 0.5 (draw) or 0 (loss). */
export function eloDelta(mine: number, theirs: number, result: number) {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  return Math.round(K * (result - expected));
}

/**
 * The week a match's XP counts for. finishedAt is server time, so a phone clock that runs ahead
 * can't file it under a week the rules haven't reached (they'd refuse the whole settlement). A
 * match settled over a week late (e.g. from history) counts for this week, as the rules require.
 */
function settlementWeek(finishedAtMs: number | undefined) {
  const thisWeek = currentWeekId();
  if (finishedAtMs === undefined) return thisWeek;
  const finishedWeek = weekIdAt(finishedAtMs);
  return finishedWeek >= thisWeek - 1 ? finishedWeek : thisWeek;
}

/**
 * Adds a finished match to my rating and XP, once: the same transaction marks the match
 * `players.{uid}.rated`. Friendly matches give XP only. Null if it was already settled.
 */
export function settleMatch(matchId: string, me: Me) {
  const matchRef = doc(db, 'matches', matchId);
  const myRef = ratingRef(me.uid);
  return runTransaction(db, async (tx): Promise<Settlement | null> => {
    const matchSnapshot = await tx.get(matchRef);
    const mySnapshot = await tx.get(myRef);
    if (!matchSnapshot.exists()) return null;
    const match = toMatch(matchSnapshot);
    const mine = match.players[me.uid];
    const oppId = opponentId(match, me.uid);
    if (match.status !== 'finished' || !mine || mine.rated || !oppId) return null;

    const current = toRating(mySnapshot);
    const ratingBefore = current?.rating ?? START_RATING;
    const outcome = match.winnerId === null ? 'draw' : match.winnerId === me.uid ? 'win' : 'loss';
    const theirRating = match.players[oppId]?.rating;
    const delta =
      match.ranked && theirRating !== undefined
        ? eloDelta(ratingBefore, theirRating, outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0)
        : 0;
    // Leaving early earns nothing.
    const xp = mine.left ? 0 : XP[outcome];
    // Weekly XP for «الأوائل» restarts when the week changes (docs/leagues-plan.md §2 #3).
    // Never earlier than my stored week: the rules don't let it go backwards.
    const weekId = Math.max(settlementWeek(match.finishedAt?.toMillis()), current?.weekId ?? -1);

    tx.update(matchRef, { [`players.${me.uid}.rated`]: true });
    tx.set(myRef, {
      name: me.name,
      rating: Math.max(0, ratingBefore + delta),
      xp: (current?.xp ?? 0) + xp,
      wins: (current?.wins ?? 0) + (outcome === 'win' ? 1 : 0),
      losses: (current?.losses ?? 0) + (outcome === 'loss' ? 1 : 0),
      draws: (current?.draws ?? 0) + (outcome === 'draw' ? 1 : 0),
      lastMatchId: matchId,
      updatedAt: serverTimestamp(),
      weekId,
      weekXp: weekXpIn(current, weekId) + xp,
    });
    return { ratingBefore, rating: Math.max(0, ratingBefore + delta), xp };
  });
}
