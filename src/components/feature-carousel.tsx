import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BoltIcon, ChartIcon, DocumentIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { toArabicDigits } from '@/utils/arabic';

const CHIPS = {
  document: { background: 'rgba(99,102,241,0.18)', color: Brand.link, Icon: DocumentIcon },
  bolt: { background: 'rgba(245,158,11,0.16)', color: Brand.accent, Icon: BoltIcon },
  chart: { background: 'rgba(16,185,129,0.16)', color: Brand.success, Icon: ChartIcon },
};

type Slide = { chips: (keyof typeof CHIPS)[]; title: string; body: string };

// Slide 1 is from the design; 2 and 3 describe what the app does today (docs/welcome-auth-plan.md §5.3).
const SLIDES: Slide[] = [
  {
    chips: ['document', 'bolt', 'chart'],
    title: 'تدرّب على اختبارات كل مادة',
    body: 'بنوك أسئلة مع حلول مفصّلة خطوة بخطوة، ونتيجتك فور انتهائك.',
  },
  {
    chips: ['bolt'],
    title: 'ابدأ فورًا بدون حساب',
    body: 'تصفّح امتحانات صفك وشعبتك مباشرة، فالحساب اختياري.',
  },
  {
    chips: ['document'],
    title: 'موادك في مكان واحد',
    body: 'سجّل حسابك لنحفظ صفك وشعبتك ونفتح لك موادك مباشرة.',
  },
];

const LAST = SLIDES.length - 1;
const FLING_VELOCITY = 500;

/**
 * Swipeable feature cards with pager dots. Swipe right for the next card, as in Arabic reading
 * order: the next card sits to the left. Slides are positioned with transforms, which aren't
 * mirrored in RTL, so this behaves the same on iOS, Android and web.
 */
export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  // Cards differ in text length; all take the tallest one's height so the swipe looks even.
  const [height, setHeight] = useState(0);
  const width = useSharedValue(0);
  const position = useSharedValue(0);
  const startPosition = useSharedValue(0);

  function goTo(next: number) {
    const target = Math.min(Math.max(next, 0), LAST);
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
      position.set(Math.min(Math.max(next, 0), LAST));
    })
    .onEnd((event) => {
      let target = Math.round(position.get());
      if (event.velocityX > FLING_VELOCITY) target = Math.ceil(position.get());
      else if (event.velocityX < -FLING_VELOCITY) target = Math.floor(position.get());
      scheduleOnRN(goTo, target);
    });

  const slide = SLIDES[index];

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pan}>
        <View
          style={[styles.viewport, { height }]}
          onLayout={(event) => width.set(event.nativeEvent.layout.width)}
          // Screen readers get the current card as one element and swipe up/down to change it.
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${slide.title}. ${slide.body}`}
          accessibilityValue={{ text: `${toArabicDigits(index + 1)} من ${toArabicDigits(SLIDES.length)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => goTo(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}>
          {SLIDES.map((item, i) => (
            <SlideView
              key={item.title}
              index={i}
              position={position}
              width={width}
              minHeight={height}
              onLayout={(event) => {
                const measured = event.nativeEvent.layout.height;
                setHeight((current) => Math.max(current, measured));
              }}>
              <FeatureCard slide={item} />
            </SlideView>
          ))}
        </View>
      </GestureDetector>
      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {SLIDES.map((item, i) => (
          <View key={item.title} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
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

function FeatureCard({ slide }: { slide: Slide }) {
  return (
    <View style={styles.card}>
      <View style={styles.chips}>
        {slide.chips.map((chip) => {
          const { background, color, Icon } = CHIPS[chip];
          return (
            <View key={chip} style={[styles.chip, { backgroundColor: background }]}>
              <Icon color={color} />
            </View>
          );
        })}
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>
    </View>
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
  card: {
    flex: 1,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    lineHeight: 30,
    fontFamily: Fonts.bold,
    color: Brand.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
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
