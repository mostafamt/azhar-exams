import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { TrophyIcon } from '@/components/icons';
import { useToast } from '@/components/toast';
import { MyRankBar } from '@/components/leagues/my-rank-bar';
import { PodiumCard } from '@/components/leagues/podium-card';
import { RankRow } from '@/components/leagues/rank-row';
import { WeekCountdown } from '@/components/leagues/week-countdown';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { sendChallenge } from '@/data/challenges';
import { weekXpIn, type PlayerRating } from '@/data/ratings';
import { useAuth } from '@/hooks/use-auth';
import { useMyWeeklyRank, useWeeklyLeaderboard } from '@/hooks/use-ratings';
import { authErrorMessage } from '@/lib/auth-errors';
import { weekIdAt } from '@/utils/week';

/** The clock for «ينتهي خلال …» and for noticing that the week turned over. */
function useMinuteClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Competition ranking: equal weekly XP shares a rank («1, 2, 2, 4»), like weeklyRank's count. */
function ranked(players: PlayerRating[], weekId: number) {
  const result: { player: PlayerRating; rank: number; weekXp: number }[] = [];
  players.forEach((player, i) => {
    const weekXp = weekXpIn(player, weekId);
    const previous = result[i - 1];
    result.push({ player, weekXp, rank: previous && previous.weekXp === weekXp ? previous.rank : i + 1 });
  });
  return result;
}

/**
 * «الأوائل» (5 · Leagues): this week's top players by XP from matches, and my own rank pinned
 * above the tab bar (docs/leagues-plan.md).
 */
export default function LeaguesScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, leaveGuest } = useAuth();
  const now = useMinuteClock();
  const weekId = weekIdAt(now);
  const uid = user?.uid ?? null;
  const board = useWeeklyLeaderboard(weekId, !!user);
  const mine = useMyWeeklyRank(uid, weekId);
  const toast = useToast();
  // The player I'm sending a challenge to, while it's being sent.
  const [challenging, setChallenging] = useState<string | null>(null);

  async function challenge(player: PlayerRating) {
    if (!uid || !profile || challenging) return;
    setChallenging(player.uid);
    try {
      const sent = await sendChallenge({ uid, name: profile.name }, player.uid);
      router.push({
        pathname: '/match/[id]',
        params: { id: sent.matchId, challenge: sent.challengeId, opponent: player.name },
      });
    } catch (e) {
      toast(e instanceof Error && e.message === 'empty-bank' ? 'لا توجد أسئلة بعد.' : authErrorMessage(e), 'error');
    } finally {
      setChallenging(null);
    }
  }

  // Others' XP may have moved my rank since I last looked; the first focus is the mount itself.
  const focusedBefore = useRef(false);
  const { refresh } = mine;
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) refresh();
      focusedBefore.current = true;
    }, [refresh])
  );

  const rows = ranked(board.players, weekId);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  let body;
  if (!user) {
    body = (
      <View style={styles.guest}>
        <View style={styles.guestIcon}>
          <TrophyIcon color={Brand.accentBright} size={30} />
        </View>
        <Text style={styles.guestTitle}>نافس زملاءك كل أسبوع</Text>
        <Text style={styles.guestBody}>سجّل الدخول لتظهر في ترتيب الدوريات وتجمع نقاط الخبرة من المباريات.</Text>
        <View style={styles.guestButton}>
          <AuthButton title="تسجيل الدخول أو إنشاء حساب" onPress={leaveGuest} />
        </View>
      </View>
    );
  } else if (board.status === 'loading') {
    body = <ActivityIndicator size="large" color={Brand.link} style={styles.state} />;
  } else if (board.status === 'error') {
    body = <Text style={[styles.message, styles.state]}>تعذّر التحميل، تحقق من اتصالك بالإنترنت.</Text>;
  } else if (rows.length === 0) {
    body = <Text style={[styles.message, styles.state]}>لم يلعب أحد هذا الأسبوع بعد. العب مباراة لتتصدّر!</Text>;
  } else {
    body = (
      <>
        <View style={styles.podium} accessibilityLabel="المراكز الثلاثة الأولى">
          {podium.map((row) => (
            <PodiumCard key={row.player.uid} {...row} mine={row.player.uid === uid} />
          ))}
        </View>
        {rest.length > 0 && (
          <View accessibilityLabel="باقي الترتيب">
            {rest.map((row) => (
              <RankRow
                key={row.player.uid}
                {...row}
                mine={row.player.uid === uid}
                // Playing needs a profile (a name); my own row has nobody to challenge.
                onChallenge={profile && row.player.uid !== uid ? () => challenge(row.player) : undefined}
                challenging={challenging === row.player.uid}
              />
            ))}
          </View>
        )}
      </>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={[styles.column, styles.header]}>
        <Text style={styles.title} accessibilityRole="header">
          الأوائل
        </Text>
        <View style={styles.headerRow}>
          <View accessibilityRole="tablist" accessibilityLabel="الفترة">
            <View style={styles.pill} accessibilityRole="tab" accessibilityState={{ selected: true }}>
              <Text style={styles.pillText}>هذا الأسبوع</Text>
            </View>
          </View>
          <WeekCountdown weekId={weekId} now={now} />
        </View>
      </View>

      <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
        <View style={[styles.column, styles.sections]}>{body}</View>
      </ScrollView>

      {uid && (
        <MyRankBar
          uid={uid}
          name={profile?.name ?? user?.displayName ?? null}
          rank={mine.rank}
          weekXp={mine.weekXp}
          loading={mine.loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  fill: {
    flex: 1,
  },
  // Phone width on large screens (web), centered.
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  header: {
    gap: 12,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: Brand.primary,
  },
  pillText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.white,
  },
  content: {
    paddingTop: 4,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sections: {
    gap: 16,
  },
  podium: {
    gap: 8,
  },
  state: {
    paddingVertical: 40,
  },
  message: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  guest: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  guestIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.accentSoft,
  },
  guestTitle: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  guestButton: {
    alignSelf: 'stretch',
  },
  guestBody: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
