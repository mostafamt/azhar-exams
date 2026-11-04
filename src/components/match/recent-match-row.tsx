import { Pressable, StyleSheet, Text } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { opponentId, PRESETS, type Match } from '@/data/matches';

const BADGES = {
  win: { label: 'فوز', color: Brand.success, backgroundColor: Brand.successSoft },
  loss: { label: 'خسارة', color: Brand.error, backgroundColor: 'rgba(239,68,68,0.12)' },
  draw: { label: 'تعادل', color: '#CBD5E1', backgroundColor: 'rgba(148,163,184,0.14)' },
};

/** One finished match in «آخر المباريات» (7a): opponent, score and result. */
export function RecentMatchRow({ match, uid, onPress }: { match: Match; uid: string; onPress: () => void }) {
  const oppId = opponentId(match, uid);
  const oppName = (oppId && match.players[oppId]?.name) || 'منافس';
  const myScore = match.players[uid]?.score ?? 0;
  const oppScore = (oppId && match.players[oppId]?.score) || 0;
  const preset = PRESETS[match.preset].label;
  const badge = BADGES[match.winnerId === null ? 'draw' : match.winnerId === uid ? 'win' : 'loss'];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${oppName}، ${preset}، أنت ${myScore} والمنافس ${oppScore}، ${badge.label}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar uid={oppId} name={oppName} size={32} backgroundColor={Brand.border} color={Brand.text} />
      <Text style={styles.name} numberOfLines={1}>
        {oppName} · {preset}
      </Text>
      {/* Isolated left-to-right (LRI … PDI), so mine stays first on every platform. */}
      <Text style={styles.score}>{`\u2066${myScore} – ${oppScore}\u2069`}</Text>
      <Text style={[styles.badge, { color: badge.color, backgroundColor: badge.backgroundColor }]}>{badge.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.text,
  },
  // Mine first, left to right, as in the design.
  score: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.bold,
  },
});
