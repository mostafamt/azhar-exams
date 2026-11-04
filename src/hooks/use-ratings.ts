import { onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import {
  ratingRef,
  START_RATING,
  toRating,
  weeklyLeaderboardQuery,
  weeklyRank,
  weekXpIn,
  type PlayerRating,
} from '@/data/ratings';

/** My rating, live; START_RATING until my first ranked match (or while loading). */
export function useMyRating(uid: string | null) {
  const [loaded, setLoaded] = useState<{ uid: string; rating: PlayerRating | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      ratingRef(uid),
      (snapshot) => setLoaded({ uid, rating: toRating(snapshot) }),
      () => setLoaded({ uid, rating: null }),
    );
  }, [uid]);

  const mine = loaded?.uid === uid ? loaded.rating : null;
  return { rating: mine?.rating ?? START_RATING, xp: mine?.xp ?? 0, loaded: loaded?.uid === uid };
}


/**
 * «الأوائل»: this week's top players by weekly XP, live (docs/leagues-plan.md). `weekId` is the
 * week shown; the screen passes a new one when the week turns over while it's open.
 */
export function useWeeklyLeaderboard(weekId: number, enabled = true) {
  const [state, setState] = useState<{
    weekId: number;
    players: PlayerRating[];
    status: 'loading' | 'ready' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      weeklyLeaderboardQuery(weekId),
      (snapshot) =>
        setState({
          weekId,
          players: snapshot.docs.map(toRating).filter((rating) => rating !== null),
          status: 'ready',
        }),
      () => setState({ weekId, players: [], status: 'error' })
    );
  }, [weekId, enabled]);

  return state?.weekId === weekId ? state : { weekId, players: [] as PlayerRating[], status: 'loading' as const };
}

/**
 * My weekly XP (live) and rank (a count query, refreshed when my XP changes or `refresh` is
 * called). rank is null while unknown or when I have no XP this week.
 */
export function useMyWeeklyRank(uid: string | null, weekId: number) {
  const [rating, setRating] = useState<{ uid: string; rating: PlayerRating | null } | null>(null);
  const [rank, setRank] = useState<{ key: string; rank: number | null } | null>(null);
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      ratingRef(uid),
      (snapshot) => setRating({ uid, rating: toRating(snapshot) }),
      () => setRating({ uid, rating: null })
    );
  }, [uid]);

  const known = !!uid && rating?.uid === uid;
  const weekXp = known ? weekXpIn(rating.rating, weekId) : 0;
  const key = `${uid}/${weekId}/${weekXp}/${refreshes}`;

  useEffect(() => {
    // No XP this week = no rank; nothing to count.
    if (!known || weekXp === 0) return;
    let active = true;
    weeklyRank(weekId, weekXp)
      .then((value) => active && setRank({ key, rank: value }))
      .catch(() => active && setRank({ key, rank: null }));
    return () => {
      active = false;
    };
  }, [known, weekId, weekXp, key]);

  const counted = weekXp === 0 || rank?.key === key;
  // Stable, so a focus effect can depend on it.
  const refresh = useCallback(() => setRefreshes((n) => n + 1), []);
  return {
    rank: weekXp > 0 && rank?.key === key ? rank.rank : null,
    weekXp,
    loading: !!uid && (!known || !counted),
    refresh,
  };
}
