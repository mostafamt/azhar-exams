import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** 18pt checkbox of the dark auth designs; the whole row (≥ 44pt) is the touch target. */
export function Checkbox({ label, checked, onChange }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <CheckIcon color={Brand.white} size={14} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Brand.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: Brand.primaryBright,
    borderColor: Brand.primaryBright,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
