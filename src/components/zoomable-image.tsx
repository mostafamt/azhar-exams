import { Image, type ImageSource } from 'expo-image';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const SWIPE_THRESHOLD = 80;

type Props = {
  source: ImageSource | number;
  /** Swipe right while not zoomed — the next page in Arabic reading order. */
  onSwipeNext?: () => void;
  /** Swipe left while not zoomed. */
  onSwipePrevious?: () => void;
};

/**
 * Full-size image with pinch-to-zoom, pan while zoomed and double-tap zoom.
 * Remount it (via `key`) to reset the zoom when the source changes.
 */
export function ZoomableImage({ source, onSwipeNext, onSwipePrevious }: Props) {
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
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = Math.min(Math.max(savedScale.value * event.scale, MIN_SCALE), MAX_SCALE);
      scale.value = nextScale;
      translateX.value = clampTranslation(translateX.value, width.value, nextScale);
      translateY.value = clampTranslation(translateY.value, height.value, nextScale);
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (savedScale.value <= MIN_SCALE) return;
      translateX.value = clampTranslation(
        savedTranslateX.value + event.translationX,
        width.value,
        scale.value
      );
      translateY.value = clampTranslation(
        savedTranslateY.value + event.translationY,
        height.value,
        scale.value
      );
    })
    .onEnd((event) => {
      if (savedScale.value > MIN_SCALE) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
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
      if (savedScale.value > MIN_SCALE) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.container, animatedStyle]}
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
          height.value = event.nativeEvent.layout.height;
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
