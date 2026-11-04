import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SwordIcon } from '@/components/icons';
import { formatXp } from '@/components/leagues/podium-card';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { PlayerRating } from '@/data/ratings';

type Props = {
  player: PlayerRating;
  rank: number;
  weekXp: number;
  mine: boolean;
  /** «تحدَّ» (docs/leagues-plan.md §5); no button without it (my own row, guests without a profile). */
  onChallenge?: () => void;
  /** This row's challenge is being sent. */
  challenging?: boolean;
};

/** Rank 4 and below (5 · Leagues), with «تحدَّ» to challenge that player. */
export function RankRow({ player, rank, weekXp, mine, onChallenge, challenging }: Props) {
  const name = mine ? `${player.name} (أنت)` : player.name;

  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      {/* One element for screen readers; the «تحدَّ» button stays reachable on its own. */}
      <View style={styles.info} accessible accessibilityLabel={`المركز ${rank}، ${name}، ${weekXp} نقطة خبرة`}>
        <Text style={styles.rank}>{rank.toLocaleString('en-US')}</Text>
        <Avatar
          uid={player.uid}
          name={player.name}
          size={40}
          backgroundColor={Brand.surface}
          color={Brand.text}
          ring={{ width: 1, color: Brand.border }}
        />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.xp}>{formatXp(weekXp)}</Text>
      </View>
      {onChallenge ? (
        <Pressable
          onPress={onChallenge}
          disabled={challenging}
          accessibilityRole="button"
          accessibilityLabel={`تحدَّ ${player.name}`}
          accessibilityState={{ busy: challenging }}
          style={({ pressed }) => [styles.challenge, pressed && styles.pressed]}>
          {challenging ? (
            <ActivityIndicator size="small" color={Brand.link} />
          ) : (
            <SwordIcon color={Brand.link} size={18} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingStart: 4,
    paddingEnd: 4,
    borderBottomWidth: 1,
    borderBottomColor: Brand.surface,
  },
  rowMine: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primarySoft,
  },
  rank: {
    width: 32,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.textMuted,
  },
  info: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.semiBold,
    color: Brand.text,
  },
  challenge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: Brand.primarySoft,
  },
  xp: {
    writingDirection: 'ltr',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: '#CBD5E1',
  },
});
