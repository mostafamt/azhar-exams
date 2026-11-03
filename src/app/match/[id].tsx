import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { MatchScreen } from '@/components/match/match-screen';
import { firestoreSource } from '@/data/match-source';

/** A live 1v1 match (docs/match-plan.md §5), then its result. */
export default function MatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const source = useMemo(() => firestoreSource(id), [id]);
  return <MatchScreen source={source} />;
}
