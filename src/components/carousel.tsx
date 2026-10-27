import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Brand } from '@/constants/colors';
import { toArabicDigits } from '@/utils/arabic';

const FLING_VELOCITY = 500;

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  /** What a screen reader announces for the current card. */
  labelOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Swipeable cards with pager dots. Swipe right for the next card, as in Arabic reading
 * order: the next card sits to the left. Slides are positioned with transforms, which aren't
 * mirrored in RTL, so this behaves the same on iOS, Android and web.
 */
export function Carousel<T>({ items, keyOf, labelOf, renderItem, style }: Props<T>) {
  const last = items.length - 1;
  const [index, setIndex] = useState(0);
  // Cards differ in text length; all take the tallest one's height so the swipe looks even.
  const [height, setHeight] = useState(0);
  const width = useSharedValue(0);
  const position = useSharedValue(0);
  const startPosition = useSharedValue(0);

  function goTo(next: number) {
    const target = Math.min(Math.max(next, 0), last);
    setIndex(target);
    position.set(withTiming(target));
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startPosition.set(position.get());
    })
    .onUpdate((event) => {
      if (width.get() === 0) return;
      const next = startPosition.get() + event.translationX / width.get();
      position.set(Math.min(Math.max(next, 0), last));
    })
    .onEnd((event) => {
      let target = Math.round(position.get());
      if (event.velocityX > FLING_VELOCITY) target = Math.ceil(position.get());
      else if (event.velocityX < -FLING_VELOCITY) target = Math.floor(position.get());
      scheduleOnRN(goTo, target);
    });

  const current = items[index];
  if (!current) return null;

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={pan}>
        <View
          style={[styles.viewport, { height }]}
          onLayout={(event) => width.set(event.nativeEvent.layout.width)}
          // Screen readers get the current card as one element and swipe up/down to change it.
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={labelOf(current)}
          accessibilityValue={{ text: `${toArabicDigits(index + 1)} من ${toArabicDigits(items.length)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => goTo(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}>
          {items.map((item, i) => (
            <SlideView
              key={keyOf(item)}
              index={i}
              position={position}
              width={width}
              minHeight={height}
              onLayout={(event) => {
                const measured = event.nativeEvent.layout.height;
                setHeight((h) => Math.max(h, measured));
              }}>
              {renderItem(item)}
            </SlideView>
          ))}
        </View>
      </GestureDetector>
      {items.length > 1 && (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {items.map((item, i) => (
            <View key={keyOf(item)} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function SlideView({
  index,
  position,
  width,
  minHeight,
  onLayout,
  children,
}: {
  index: number;
  position: SharedValue<number>;
  width: SharedValue<number>;
  minHeight: number;
  onLayout: (event: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  // Card `index` is at 0 when it's current, one width to the left per step after it.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (position.get() - index) * width.get() }],
  }));

  return (
    <Animated.View style={[styles.slide, { minHeight }, animatedStyle]} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  viewport: {
    overflow: 'hidden',
  },
  // Both sides pinned, so it doesn't matter whether RTL swaps left and right.
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Brand.primaryBright,
  },
});
