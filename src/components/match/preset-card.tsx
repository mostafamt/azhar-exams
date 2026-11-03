import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  label: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
};

/** One of the three «مدة المباراة» cards in the match lobby (7a). */
export function PresetCard({ label, sub, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${label}، ${sub}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  selected: {
    borderColor: Brand.primaryBright,
    backgroundColor: Brand.primarySoft,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  sub: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
