import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { PlayerRating } from '@/data/ratings';

/** Gold, silver and bronze (5 · Leagues), by rank. */
export const MEDALS = [
  { medal: '#FBBF24', tint: 'rgba(251,191,36,0.10)', edge: 'rgba(251,191,36,0.35)', label: 'ذهبي' },
  { medal: '#CBD5E1', tint: 'rgba(203,213,225,0.08)', edge: 'rgba(203,213,225,0.28)', label: 'فضي' },
  { medal: '#D97706', tint: 'rgba(217,119,6,0.10)', edge: 'rgba(217,119,6,0.35)', label: 'برونزي' },
];

const PLACES = ['الأول', 'الثاني', 'الثالث'];

export function formatXp(xp: number) {
  return `${xp.toLocaleString('en-US')} XP`;
}

/** One of the top three: medal, avatar, name and weekly XP in the medal's colour. */
export function PodiumCard({ player, rank, weekXp, mine }: { player: PlayerRating; rank: number; weekXp: number; mine: boolean }) {
  const medal = MEDALS[rank - 1] ?? MEDALS[MEDALS.length - 1];
  const name = mine ? `${player.name} (أنت)` : player.name;

  return (
    <View
      style={[styles.card, { backgroundColor: medal.tint, borderColor: mine ? Brand.primaryBright : medal.edge }]}
      accessible
      accessibilityLabel={`المركز ${PLACES[rank - 1] ?? rank}، ${medal.label}، ${name}، ${weekXp} نقطة خبرة`}>
      <View style={[styles.medal, { backgroundColor: medal.medal }]}>
        <Text style={styles.medalText}>{rank}</Text>
      </View>
      <Avatar uid={player.uid} name={player.name} size={44} backgroundColor={Brand.border} color={Brand.text} />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.xp, { color: medal.medal }]}>{formatXp(weekXp)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  medal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
    color: Brand.background,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  xp: {
    writingDirection: 'ltr',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
  },
});
