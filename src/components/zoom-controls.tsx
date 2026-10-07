import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  /** Shown between the buttons, e.g. "١٥٠٪". */
  label?: string;
  /** `dark` for use on the black full-screen viewer. */
  variant?: 'light' | 'dark';
};

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  canZoomIn = true,
  canZoomOut = true,
  label,
  variant = 'light',
}: Props) {
  const dark = variant === 'dark';
  return (
    <View style={[styles.container, dark ? styles.containerDark : styles.containerLight]}>
      <ZoomButton symbol="+" label="تكبير" disabled={!canZoomIn} dark={dark} onPress={onZoomIn} />
      {label ? <Text style={[styles.label, dark && styles.textDark]}>{label}</Text> : null}
      <ZoomButton symbol="−" label="تصغير" disabled={!canZoomOut} dark={dark} onPress={onZoomOut} />
    </View>
  );
}

function ZoomButton({
  symbol,
  label,
  disabled,
  dark,
  onPress,
}: {
  symbol: string;
  label: string;
  disabled: boolean;
  dark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.symbol, dark && styles.textDark]}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 4,
    gap: 4,
  },
  containerLight: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  label: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  textDark: {
    color: Colors.onOverlay,
  },
  disabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.6,
  },
});
