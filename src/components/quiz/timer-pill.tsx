import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ClockIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

/** Below this the pill turns red and pulses. */
const LOW_TIME_MS = 2 * 60_000;

function formatTime(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Time left, as `mm:ss` in Western digits like the design. */
export function TimerPill({ remaining }: { remaining: number }) {
  const low = remaining <= LOW_TIME_MS;
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!low) return;
    opacity.set(withRepeat(withTiming(0.45, { duration: 500 }), -1, true));
    return () => {
      cancelAnimation(opacity);
      opacity.set(1);
    };
  }, [low, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const text = formatTime(remaining);

  return (
    <Animated.View
      style={[styles.pill, low && styles.low, pulse]}
      accessible
      accessibilityLabel={`الوقت المتبقي ${text}`}>
      <ClockIcon color={low ? Brand.error : Brand.link} size={16} />
      <Text style={[styles.text, low && styles.lowText]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Clock then digits, left to right, whatever the layout direction.
  pill: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  low: {
    borderColor: Brand.danger,
    backgroundColor: Brand.dangerSoft,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.text,
    fontVariant: ['tabular-nums'],
  },
  lowText: {
    fontFamily: Fonts.extraBold,
    color: Brand.error,
  },
});
