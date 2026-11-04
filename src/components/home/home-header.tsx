import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useMyAvatar } from '@/hooks/use-avatar';

/**
 * Avatar and greeting. The design's streak and level pills wait for an activity feature
 * (docs/home-plan.md §2.1). Shows the student's photo (docs/profile-photo-plan.md) or their
 * initial; guests have no name, so they get a person icon.
 */
export function HomeHeader({ uid, name }: { uid: string | null; name: string | null }) {
  const avatar = useMyAvatar(uid);

  return (
    <View style={styles.row}>
      <Avatar size={46} name={name} url={avatar.url} />
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
