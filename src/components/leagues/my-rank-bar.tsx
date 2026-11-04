import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { formatXp } from '@/components/leagues/podium-card';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  uid: string;
  name: string | null;
  /** null when unknown or without XP this week. */
  rank: number | null;
  weekXp: number;
  loading: boolean;
};

/** «أنت»: my rank and weekly XP, pinned above the tab bar (5 · Leagues). */
export function MyRankBar({ uid, name, rank, weekXp, loading }: Props) {
  const unranked = !loading && weekXp === 0;

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={unranked ? () => router.push('/match') : undefined}
        disabled={!unranked}
        accessibilityRole={unranked ? 'button' : undefined}
        accessibilityLabel={
          unranked
            ? 'لم تكسب نقاط خبرة هذا الأسبوع. العب مباراة لتظهر في الترتيب'
            : rank
              ? `ترتيبك ${rank}، ${weekXp} نقطة خبرة`
              : 'ترتيبك'
        }
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {loading ? (
          <ActivityIndicator size="small" color={Brand.primaryPale} style={styles.rankSlot} />
        ) : (
          <Text style={[styles.rank, styles.rankSlot]}>{rank ? `#${rank.toLocaleString('en-US')}` : '—'}</Text>
        )}
        <View style={styles.divider} />
        <Avatar uid={uid} name={name} size={36} backgroundColor={Brand.primary} color={Brand.white} />
        <View style={styles.text}>
          <Text style={styles.me}>أنت</Text>
          {unranked ? <Text style={styles.hint}>العب مباراة لتظهر في الترتيب</Text> : null}
        </View>
        <Text style={styles.xp}>{formatXp(weekXp)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Brand.background,
    borderTopWidth: 1,
    borderTopColor: Brand.surface,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primaryDeep,
  },
  pressed: {
    opacity: 0.85,
  },
  rankSlot: {
    minWidth: 36,
  },
  rank: {
    writingDirection: 'ltr',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.primaryPale,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Brand.primary,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  me: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.semiBold,
    color: Brand.primaryPale,
  },
  xp: {
    writingDirection: 'ltr',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
    color: Brand.accentBright,
  },
});
