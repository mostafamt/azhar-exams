import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import {
  CHALLENGE_TTL_MS,
  challengeExpiresAt,
  challengeRef,
  incomingChallengesQuery,
  toChallenge,
  type Challenge,
} from '@/data/challenges';

/** Ticks every few seconds while `active`, so expired challenges drop out on time. */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/** The newest challenge to me that's still pending and not expired; null when there's none. */
export function useIncomingChallenge(uid: string | null) {
  const [loaded, setLoaded] = useState<{ uid: string; challenges: Challenge[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      incomingChallengesQuery(uid, Date.now() - CHALLENGE_TTL_MS),
      (snapshot) =>
        setLoaded({ uid, challenges: snapshot.docs.map(toChallenge).filter((c) => c !== null) }),
      // No index yet or offline: no banner rather than an error.
      () => setLoaded({ uid, challenges: [] })
    );
  }, [uid]);

  const challenges = uid && loaded?.uid === uid ? loaded.challenges : [];
  const now = useNow(challenges.length > 0);
  const live = challenges.filter((c) => challengeExpiresAt(c) > now);
  live.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  return live[0] ?? null;
}

/** A challenge I sent, live, and whether it has lapsed unanswered. */
export function useSentChallenge(id: string | null) {
  const [loaded, setLoaded] = useState<{ id: string; challenge: Challenge | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      challengeRef(id),
      (snapshot) => setLoaded({ id, challenge: toChallenge(snapshot) }),
      () => setLoaded({ id, challenge: null })
    );
  }, [id]);

  const challenge = id && loaded?.id === id ? loaded.challenge : null;
  const now = useNow(challenge?.status === 'pending');
  const expired = !!challenge && challenge.status === 'pending' && challengeExpiresAt(challenge) <= now;
  return { challenge, expired };
}
