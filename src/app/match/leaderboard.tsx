import { Redirect } from 'expo-router';

/** The old all-time leaderboard; the «الأوائل» tab replaced it (docs/leagues-plan.md). */
export default function LeaderboardRedirect() {
  return <Redirect href="/leagues" />;
}
