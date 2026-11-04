import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { MatchScreen } from '@/components/match/match-screen';
import { firestoreSource } from '@/data/match-source';

/** A live 1v1 match (docs/match-plan.md §5), then its result. */
export default function MatchRoute() {
  // `challenge` and `opponent` come from «تحدَّ» on «الأوائل» (docs/leagues-plan.md §5).
  const { id, challenge, opponent } = useLocalSearchParams<{ id: string; challenge?: string; opponent?: string }>();
  const source = useMemo(() => firestoreSource(id), [id]);
  const sent = useMemo(
    () => (challenge ? { id: challenge, opponentName: opponent || 'المنافس' } : undefined),
    [challenge, opponent]
  );
  return <MatchScreen source={source} challenge={sent} />;
}
