import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';

type Props = {
  title: string;
  subtitle?: string;
  thumbnail?: number;
  onPress: () => void;
};

/** Tappable row used for subjects and exams. */
export function ListCard({ title, subtitle, thumbnail, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {thumbnail !== undefined && (
        <Image source={thumbnail} style={styles.thumbnail} contentFit="cover" contentPosition="top" />
      )}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: 48,
    height: 64,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
});
