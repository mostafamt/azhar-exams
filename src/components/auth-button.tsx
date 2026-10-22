import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Props = {
  title: string;
  onPress: () => void;
  /** Filled indigo, or the dark outlined style. */
  variant?: 'primary' | 'outline';
  /** Shown before the title (on the right, in RTL). */
  icon?: ReactNode;
  /** Shows a spinner and ignores presses, e.g. while a request is in flight. */
  loading?: boolean;
};

/** Large button of the dark welcome design. */
export function AuthButton({ title, onPress, variant = 'primary', icon, loading }: Props) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [styles.button, outline && styles.outline, pressed && styles.pressed]}>
      {loading ? (
        <ActivityIndicator color={Brand.white} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, outline && styles.outlineText]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 20,
    backgroundColor: Brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  outline: {
    backgroundColor: Brand.surface,
    borderWidth: 1.5,
    borderColor: Brand.border,
    gap: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: Brand.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  outlineText: {
    color: Brand.text,
    fontFamily: Fonts.semiBold,
  },
});
