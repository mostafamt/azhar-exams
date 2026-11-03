import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { MatchScreen } from '@/components/match/match-screen';
import { botSource } from '@/data/bot-match';
import { PRESETS, type PresetId } from '@/data/matches';
import { useAuth } from '@/hooks/use-auth';

/** «تدرّب ضد الروبوت»: a practice match on this phone, on the live match screen. */
export default function BotMatchRoute() {
  const params = useLocalSearchParams<{ preset?: string; subjectId?: string; subjectName?: string }>();
  const { user, profile } = useAuth();
  // One practice match per visit; «إعادة التحدّي» opens this route again for a new one.
  const [source] = useState(() => {
    const preset = (params.preset && params.preset in PRESETS ? params.preset : 'short') as PresetId;
    const subject = params.subjectId ? { id: params.subjectId, name: params.subjectName ?? '' } : null;
    return botSource({ uid: user?.uid ?? '', name: profile?.name ?? '' }, preset, subject);
  });
  return <MatchScreen source={source} />;
}
