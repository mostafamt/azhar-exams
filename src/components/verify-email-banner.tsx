import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/use-auth';
import { resendVerification } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';
import { toArabicDigits } from '@/utils/arabic';

const RESEND_COOLDOWN_SECONDS = 60;

/** Reminder for signed-in users whose email isn't verified yet. Verification doesn't block anything. */
export function VerifyEmailBanner() {
  const { user, emailVerified, refreshUser } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!user || emailVerified) return null;

  async function resend() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    try {
      await resendVerification();
      setMessage('أرسلنا رسالة التأكيد مرة أخرى.');
    } catch (e) {
      setMessage(authErrorMessage(e));
    }
  }

  async function check() {
    setChecking(true);
    try {
      await refreshUser();
      setMessage('لم يتم التأكيد بعد. افتح الرابط في الرسالة ثم حاول مرة أخرى.');
    } catch (e) {
      setMessage(authErrorMessage(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>أكّد بريدك الإلكتروني</Text>
      <Text style={styles.body}>
        أرسلنا رابط التأكيد إلى {user.email}. تحقق من صندوق الوارد والرسائل غير المرغوب فيها.
      </Text>
      {message ? <Text style={styles.body}>{message}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={check} disabled={checking} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, checking && styles.actionDisabled]}>تم التأكيد</Text>
        </Pressable>
        <Pressable onPress={resend} disabled={cooldown > 0} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.action, cooldown > 0 && styles.actionDisabled]}>
            {cooldown > 0 ? `إعادة الإرسال (${toArabicDigits(cooldown)})` : 'إعادة الإرسال'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    backgroundColor: Brand.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  title: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.accentBright,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  action: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.bold,
    color: Brand.link,
  },
  actionDisabled: {
    opacity: 0.5,
  },
});
