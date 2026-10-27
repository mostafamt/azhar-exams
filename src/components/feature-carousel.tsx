import { StyleSheet, Text, View } from 'react-native';

import { Carousel } from '@/components/carousel';
import { BoltIcon, ChartIcon, DocumentIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

const CHIPS = {
  document: { background: Brand.primarySoft, color: Brand.link, Icon: DocumentIcon },
  bolt: { background: Brand.accentSoft, color: Brand.accent, Icon: BoltIcon },
  chart: { background: Brand.successSoft, color: Brand.success, Icon: ChartIcon },
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

/** The welcome screen's feature cards. */
export function FeatureCarousel() {
  return (
    <Carousel
      items={SLIDES}
      keyOf={(slide) => slide.title}
      labelOf={(slide) => `${slide.title}. ${slide.body}`}
      renderItem={(slide) => <FeatureCard slide={slide} />}
    />
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
});
