import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  title: string;
  onPress: () => void;
  /** Shows a spinner and ignores presses, e.g. while a request is in flight. */
  loading?: boolean;
  disabled?: boolean;
  /** Outlined instead of filled. */
  secondary?: boolean;
};

export function PrimaryButton({ title, onPress, loading, disabled, secondary }: Props) {
  const inactive = loading || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={secondary ? Colors.primary : Colors.onOverlay} />
      ) : (
        <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    minHeight: 50,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  secondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: Colors.onOverlay,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryText: {
    color: Colors.primary,
  },
});
