import { useState } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Brand } from '@/constants/colors';

type Props = {
  value: SharedValue<number>;
  min: number;
  max: number;
  step: number;
  /** Runs after every change, on the UI thread or JS (a worklet), e.g. to re-clamp the crop. */
  onChange?: (value: number) => void;
  accessibilityLabel: string;
};

const THUMB = 24;

/**
 * A horizontal slider on a shared value (6 · Profile's «تكبير»). The app is RTL, so like the
 * design's range input the minimum is on the right. Positions use transforms only: they're
 * physical on every platform, unlike left/right, which RTL may swap.
 */
export function ZoomSlider({ value, min, max, step, onChange, accessibilityLabel }: Props) {
  const width = useSharedValue(0);
  const [percent, setPercent] = useState(Math.round(value.get() * 100));

  useAnimatedReaction(
    () => Math.round(value.get() * 100),
    (now, previous) => {
      if (now !== previous) scheduleOnRN(setPercent, now);
    }
  );

  const setValue = (next: number) => {
    'worklet';
    const stepped = Math.round((next - min) / step) * step + min;
    const clamped = Math.min(Math.max(stepped, min), max);
    value.set(clamped);
    onChange?.(clamped);
  };

  const setFromX = (x: number) => {
    'worklet';
    if (width.get() <= 0) return;
    const fraction = 1 - Math.min(Math.max(x / width.get(), 0), 1);
    setValue(min + fraction * (max - min));
  };

  const drag = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => setFromX(event.x))
    .onUpdate((event) => setFromX(event.x));

  // Where the thumb is, from the left edge: the right edge is `min`.
  const thumbX = () => {
    'worklet';
    return width.get() * (1 - (value.get() - min) / (max - min));
  };

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX() }] }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX() - width.get() / 2 }] }));

  function onAccessibilityAction(event: AccessibilityActionEvent) {
    const delta = event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1;
    setValue(value.get() + delta);
  }

  return (
    <GestureDetector gesture={drag}>
      <View
        style={styles.hitArea}
        onLayout={(event) => width.set(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: min * 100, max: max * 100, now: percent, text: `${percent}%` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <View style={styles.thumbLane} pointerEvents="none">
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Brand.border,
  },
  // Full width, moved right by the thumb's position, so it covers from the thumb to the right edge.
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.primaryBright,
  },
  thumbLane: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Brand.white,
    borderWidth: 3,
    borderColor: Brand.primaryBright,
  },
});
