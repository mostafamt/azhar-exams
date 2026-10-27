import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { BellIcon, DocumentIcon, TrophyIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import type { Announcement } from '@/data/announcements';

const ICONS = { trophy: TrophyIcon, document: DocumentIcon, bell: BellIcon };

/** One slide of the home carousel. */
export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const Icon = ICONS[announcement.icon];

  return (
    <View style={styles.card}>
      <View style={styles.watermark}>
        <Icon color="rgba(245,158,11,0.22)" size={130} strokeWidth={1.5} />
      </View>
      <Chip label={announcement.badge} tone={announcement.badgeTone} />
      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.body}>{announcement.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 150,
    backgroundColor: Brand.primaryDeep,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    overflow: 'hidden',
  },
  // The mockup's bottom-left corner is the end side in RTL.
  watermark: {
    position: 'absolute',
    end: -18,
    bottom: -22,
  },
  title: {
    fontSize: 19,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  body: {
    maxWidth: 240,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.primaryPale,
  },
});
