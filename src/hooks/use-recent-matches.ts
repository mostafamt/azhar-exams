import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { recentMatchesQuery, toMatch, type Match } from '@/data/matches';

/** My last finished matches, live («آخر المباريات», docs/match-plan.md §6.7). Empty until loaded or on error. */
export function useRecentMatches(uid: string | null) {
  const [loaded, setLoaded] = useState<{ uid: string; matches: Match[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      recentMatchesQuery(uid),
      (snapshot) => setLoaded({ uid, matches: snapshot.docs.map(toMatch) }),
      // Usually the index is still building; the section just stays hidden.
      (e) => {
        if (__DEV__) console.warn('recent matches failed', e);
        setLoaded({ uid, matches: [] });
      },
    );
  }, [uid]);

  return loaded?.uid === uid ? loaded.matches : [];
}
