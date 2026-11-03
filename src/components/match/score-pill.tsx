import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

/** «4 – 3»: my correct answers, then the opponent's (7b top bar). */
export function ScorePill({ me, opp }: { me: number; opp: number }) {
  return (
    <View style={styles.pill} accessible accessibilityLabel={`النتيجة: أنت ${me}، المنافس ${opp}`}>
      <Text style={[styles.text, { color: Brand.link }]}>{me}</Text>
      <Text style={[styles.text, styles.dash]}>–</Text>
      <Text style={[styles.text, { color: Brand.accentBright }]}>{opp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  text: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
  },
  dash: {
    color: '#475569',
  },
});
