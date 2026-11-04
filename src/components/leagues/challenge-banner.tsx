import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { SwordIcon } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { answerChallenge } from '@/data/challenges';
import { joinByCode, PRESETS } from '@/data/matches';
import { useAuth } from '@/hooks/use-auth';
import { useIncomingChallenge } from '@/hooks/use-challenges';
import { JOIN_ERRORS } from '@/hooks/use-room';
import { authErrorMessage } from '@/lib/auth-errors';

/**
 * Screens where an invite would interrupt: the match lobby (a random search there would keep
 * running under the accepted match), a live match, a quick test, the photo cropper. The invite
 * shows once the student leaves them, if it hasn't lapsed.
 */
function busyOn(pathname: string) {
  return /^\/match(\/|$)/.test(pathname) || pathname === '/quick-test' || pathname === '/edit-photo';
}

/**
 * «يتحداك أحمد في مباراة»: a challenge from «الأوائل» (docs/leagues-plan.md §5), over any screen
 * while the app is open. Accepting joins the sender's room; declining tells them.
 */
export function ChallengeBanner() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  // Only students with a profile can play (the match routes need one).
  const uid = user && profile ? user.uid : null;
  const challenge = useIncomingChallenge(uid);
  const [busy, setBusy] = useState<string | null>(null);

  if (!challenge || !uid || !profile || busyOn(pathname)) return null;
  const working = busy === challenge.id;

  async function accept() {
    if (!challenge || !uid || !profile) return;
    setBusy(challenge.id);
    try {
      const result = await joinByCode({ uid, name: profile.name }, challenge.code);
      if ('error' in result) {
        toast(result.error === 'not-found' ? 'انتهى هذا التحدي.' : JOIN_ERRORS[result.error], 'error');
        // Nothing to accept any more; drop it from the list.
        answerChallenge(challenge.id, false).catch(() => {});
      } else {
        answerChallenge(challenge.id, true).catch(() => {});
        router.push({ pathname: '/match/[id]', params: { id: result.matchId } });
      }
    } catch (e) {
      toast(authErrorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  function decline() {
    if (!challenge) return;
    answerChallenge(challenge.id, false).catch(() => {});
  }

  return (
    <Animated.View
      key={challenge.id}
      entering={FadeInUp}
      exiting={FadeOutUp}
      style={[styles.host, { top: insets.top + 12 }]}
      pointerEvents="box-none">
      <View style={styles.card} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={styles.top}>
          <Avatar uid={challenge.from} name={challenge.fromName} size={44} radius={12} backgroundColor="#78350F" color="#FDE68A" />
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={2}>
              يتحداك {challenge.fromName} في مباراة
            </Text>
            <Text style={styles.subtitle}>{`متنوع · ${PRESETS.short.label} · ودية`}</Text>
          </View>
          <SwordIcon color={Brand.accentBright} size={22} />
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={decline}
            disabled={working}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, styles.decline, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>رفض</Text>
          </Pressable>
          <Pressable
            onPress={accept}
            disabled={working}
            accessibilityRole="button"
            accessibilityState={{ busy: working }}
            style={({ pressed }) => [styles.button, styles.accept, pressed && styles.pressed]}>
            {working ? <ActivityIndicator color={Brand.white} /> : <Text style={[styles.buttonText, styles.acceptText]}>قبول</Text>}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.accent,
    backgroundColor: Brand.surface,
    // Floats over any screen.
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decline: {
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.background,
  },
  accept: {
    backgroundColor: Brand.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  acceptText: {
    color: Brand.white,
  },
});
