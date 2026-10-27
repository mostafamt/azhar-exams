import { StyleSheet, Text, View } from 'react-native';

import { UserIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

/**
 * Avatar and greeting. The design's streak and level pills wait for an activity feature
 * (docs/home-plan.md §2.1). Guests have no name, so they get a person icon.
 */
export function HomeHeader({ name }: { name: string | null }) {
  const initial = name?.trim().charAt(0);

  return (
    <View style={styles.row}>
      <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {initial ? <Text style={styles.initial}>{initial}</Text> : <UserIcon color={Brand.primaryPale} size={22} />}
      </View>
      <View style={styles.text}>
        <Text style={styles.greeting} accessibilityRole="header" numberOfLines={1}>
          {name ? `مرحباً، ${name}` : 'مرحباً بك'}
        </Text>
        <Text style={styles.subtitle}>جاهز لاختبار اليوم؟</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Brand.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.bold,
    color: Brand.primaryPale,
  },
  text: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
});
