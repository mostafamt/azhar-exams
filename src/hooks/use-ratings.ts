import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { leaderboardQuery, ratingRef, START_RATING, toRating, type PlayerRating } from '@/data/ratings';

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

/** «لوحة الصدارة»: the top players by rating, live. */
export function useLeaderboard() {
  const [state, setState] = useState<{ players: PlayerRating[]; status: 'loading' | 'ready' | 'error' }>({
    players: [],
    status: 'loading',
  });

  useEffect(
    () =>
      onSnapshot(
        leaderboardQuery(),
        (snapshot) =>
          setState({
            players: snapshot.docs.map(toRating).filter((rating) => rating !== null),
            status: 'ready',
          }),
        () => setState({ players: [], status: 'error' }),
      ),
    [],
  );

  return state;
}
