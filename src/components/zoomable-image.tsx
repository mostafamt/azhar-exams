import { Image, type ImageSource } from 'expo-image';
import { useImperativeHandle, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 80;
const BUTTON_ZOOM_STEP = 1.5;

export type ZoomableImageHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
};

type Props = {
  source: ImageSource | number;
  /** Swipe right while not zoomed — the next page in Arabic reading order. */
  onSwipeNext?: () => void;
  /** Swipe left while not zoomed. */
  onSwipePrevious?: () => void;
  /** Exposes `zoomIn` / `zoomOut` for zoom buttons. */
  ref?: Ref<ZoomableImageHandle>;
};

/**
 * Full-size image with pinch-to-zoom, pan while zoomed, double-tap zoom and
 * button zoom (via `ref`). Remount it (via `key`) to reset the zoom when the source changes.
 */
export function ZoomableImage({ source, onSwipeNext, onSwipePrevious, ref }: Props) {
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const clampTranslation = (value: number, size: number, currentScale: number) => {
    'worklet';
    const max = (size * (currentScale - 1)) / 2;
    return Math.min(Math.max(value, -max), max);
  };

  const reset = () => {
    'worklet';
    scale.set(withTiming(1));
    savedScale.set(1);
    translateX.set(withTiming(0));
    translateY.set(withTiming(0));
    savedTranslateX.set(0);
    savedTranslateY.set(0);
  };

  const zoomTo = (nextScale: number) => {
    const clamped = Math.min(Math.max(nextScale, MIN_SCALE), MAX_SCALE);
    scale.set(withTiming(clamped));
    savedScale.set(clamped);
    // Keep the visible area inside the image at the new scale.
    savedTranslateX.set(clampTranslation(savedTranslateX.get(), width.get(), clamped));
    savedTranslateY.set(clampTranslation(savedTranslateY.get(), height.get(), clamped));
    translateX.set(withTiming(savedTranslateX.get()));
    translateY.set(withTiming(savedTranslateY.get()));
  };

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomTo(savedScale.get() * BUTTON_ZOOM_STEP),
    zoomOut: () => zoomTo(savedScale.get() / BUTTON_ZOOM_STEP),
  }));

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = Math.min(Math.max(savedScale.get() * event.scale, MIN_SCALE), MAX_SCALE);
      scale.set(nextScale);
      translateX.set(clampTranslation(translateX.get(), width.get(), nextScale));
      translateY.set(clampTranslation(translateY.get(), height.get(), nextScale));
    })
    .onEnd(() => {
      if (scale.get() <= MIN_SCALE) {
        reset();
        return;
      }
      savedScale.set(scale.get());
      savedTranslateX.set(translateX.get());
      savedTranslateY.set(translateY.get());
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (savedScale.get() <= MIN_SCALE) return;
      translateX.set(clampTranslation(
        savedTranslateX.get() + event.translationX,
        width.get(),
        scale.get()
      ));
      translateY.set(clampTranslation(
        savedTranslateY.get() + event.translationY,
        height.get(),
        scale.get()
      ));
    })
    .onEnd((event) => {
      if (savedScale.get() > MIN_SCALE) {
        savedTranslateX.set(translateX.get());
        savedTranslateY.set(translateY.get());
        return;
      }
      if (event.translationX > SWIPE_THRESHOLD && onSwipeNext) {
        scheduleOnRN(onSwipeNext);
      } else if (event.translationX < -SWIPE_THRESHOLD && onSwipePrevious) {
        scheduleOnRN(onSwipePrevious);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.get() > MIN_SCALE) {
        reset();
      } else {
        scale.set(withTiming(DOUBLE_TAP_SCALE));
        savedScale.set(DOUBLE_TAP_SCALE);
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.container, animatedStyle]}
        onLayout={(event) => {
          width.set(event.nativeEvent.layout.width);
          height.set(event.nativeEvent.layout.height);
        }}>
        <Image source={source} style={styles.image} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
});
