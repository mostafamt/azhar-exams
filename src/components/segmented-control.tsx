import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Option = { id: string; label: string };

type Props = {
  options: Option[];
  selectedId: string;
  onChange: (id: string) => void;
  /** 'dark' for the screens built from the new dark designs. */
  tone?: 'light' | 'dark';
};

/** Pill-style switch between a few options. Follows the layout direction (RTL: first option on the right). */
export function SegmentedControl({ options, selectedId, onChange, tone = 'light' }: Props) {
  const dark = tone === 'dark';
  return (
    <View style={[styles.container, dark && styles.containerDark]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.option,
              selected && (dark ? styles.optionSelectedDark : styles.optionSelected),
              pressed && !selected && styles.pressed,
            ]}>
            <Text
              style={[
                styles.label,
                selected && styles.labelSelected,
                dark && styles.labelDark,
                dark && selected && styles.labelSelectedDark,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  optionSelected: {
    backgroundColor: Colors.card,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  containerDark: {
    backgroundColor: Brand.surface,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderRadius: 14,
  },
  optionSelectedDark: {
    backgroundColor: Brand.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.primary,
  },
  // Cairo has a separate family per weight, so fontWeight is reset.
  labelDark: {
    fontFamily: Fonts.semiBold,
    fontWeight: 'normal',
    color: Brand.textMuted,
  },
  labelSelectedDark: {
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
});
