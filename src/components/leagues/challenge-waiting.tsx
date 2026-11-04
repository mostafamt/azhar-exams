import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { ShareIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useSentChallenge } from '@/hooks/use-challenges';
import { shareRoom } from '@/lib/share-room';

type Props = {
  challengeId: string;
  opponentName: string;
  /** The room's code, for sharing a link once the invite has lapsed. */
  code: string | null;
  onClose: () => void;
};

/**
 * The sender's side of «تحدَّ» while the room waits (docs/leagues-plan.md §5): waiting for an
 * answer, declined, or lapsed (then the room link can still be shared). Accepting starts the match,
 * which the match screen shows by itself.
 */
export function ChallengeWaiting({ challengeId, opponentName, code, onClose }: Props) {
  const { challenge, expired } = useSentChallenge(challengeId);

  if (challenge?.status === 'declined') {
    return (
      <View style={styles.body}>
        <Text style={styles.title}>رفض {opponentName} التحدي</Text>
        <Text style={styles.message}>جرّب تحدّي لاعب آخر من «الأوائل».</Text>
        <View style={styles.buttons}>
          <AuthButton title="رجوع" variant="outline" onPress={onClose} />
        </View>
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.body}>
        <Text style={styles.title}>لم يردّ {opponentName} بعد</Text>
        <Text style={styles.message}>
          قد لا يكون التطبيق مفتوحاً عنده الآن. شارك رابط الغرفة ليفتحها، أو ألغِ التحدي.
        </Text>
        <View style={styles.buttons}>
          {code && (
            <AuthButton
              title="مشاركة رابط الغرفة"
              onPress={() => shareRoom(code)}
              icon={<ShareIcon color={Brand.white} size={20} />}
            />
          )}
          <AuthButton title="إلغاء التحدي" variant="outline" onPress={onClose} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <ActivityIndicator size="large" color={Brand.link} />
      <Text style={styles.title}>أرسلنا التحدي إلى {opponentName}</Text>
      <Text style={styles.message}>بانتظار الرد… يلغي إغلاق الشاشة التحدي.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  buttons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
});
