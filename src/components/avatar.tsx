import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { UserIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAvatar } from '@/hooks/use-avatar';
import { avatarUrl } from '@/lib/cloudinary';

type Props = {
  size: number;
  /** Shown as the initial when there's no photo; no name = person icon (guests). */
  name?: string | null;
  /**
   * The photo's Cloudinary URL when the caller already has it (my own, from useMyAvatar).
   * Otherwise pass `uid` and the photo is read once per session.
   */
  url?: string | null;
  uid?: string | null;
  backgroundColor?: string;
  /** Initial and icon colour. */
  color?: string;
  /** A ring inside the edge, e.g. the profile card's 3px indigo border. */
  ring?: { width: number; color: string };
  /** Corner radius; a circle when left out. Match screens use rounded squares. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A student's avatar: their photo (docs/profile-photo-plan.md), or the first letter of
 * their name. Decorative: screen readers get the name from the text next to it.
 */
export function Avatar({
  size,
  name,
  url,
  uid,
  backgroundColor = Brand.primaryDeep,
  color = Brand.primaryPale,
  ring,
  radius,
  style,
}: Props) {
  const fetched = useAvatar(url === undefined ? uid : null);
  const photo = url === undefined ? fetched : url;
  // The URL that failed to load, so a new photo gets another try.
  const [failed, setFailed] = useState<string | null>(null);
  const initial = name?.trim().charAt(0);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor },
        ring && { borderWidth: ring.width, borderColor: ring.color },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {photo && failed !== photo ? (
        <Image
          source={{ uri: avatarUrl(photo, size) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFailed(photo)}
        />
      ) : initial ? (
        <Text style={[styles.initial, { color, fontSize: size * 0.37, lineHeight: size * 0.56 }]}>{initial}</Text>
      ) : (
        <UserIcon color={color} size={Math.round(size * 0.45)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontFamily: Fonts.extraBold,
  },
});
