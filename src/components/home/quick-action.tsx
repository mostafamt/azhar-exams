import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  label: string;
  Icon: ComponentType<{ color: string; size?: number }>;
  color: string;
  background: string;
  /** Without it the tile is dimmed and marked «قريباً». */
  onPress?: () => void;
};

/** One of the three shortcut tiles under the carousel. */
export function QuickAction({ label, Icon, color, background, onPress }: Props) {
  const soon = !onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={soon}
      accessibilityRole="button"
      accessibilityLabel={soon ? `${label}، قريباً` : label}
      accessibilityState={{ disabled: soon }}
      style={({ pressed }) => [styles.tile, soon && styles.soon, pressed && styles.pressed]}>
      <View style={[styles.iconBox, { backgroundColor: background }]}>
        <Icon color={color} size={22} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {soon && <Text style={styles.badge}>قريباً</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  soon: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  badge: {
    position: 'absolute',
    top: 6,
    start: 6,
    paddingHorizontal: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Brand.border,
    color: Brand.textMuted,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: Fonts.bold,
  },
});
