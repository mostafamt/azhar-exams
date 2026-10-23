import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { AuthErrorText, AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { KeyIcon, MailIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { sendPasswordReset } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';
import { toArabicDigits } from '@/utils/arabic';

const RESEND_COOLDOWN_SECONDS = 60;

// Design: docs/1c · Forgot Password-html. Two states: ask for the email, then «تحقّق من بريدك».
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send(address: string) {
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordReset(address);
      setSentTo(address.trim());
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  function submit() {
    if (!email.trim()) {
      setError('أدخل البريد الإلكتروني');
      return;
    }
    send(email);
  }

  function backToSignIn() {
    if (router.canGoBack()) router.back();
    else router.replace('/sign-in');
  }

  if (sentTo) {
    return (
      <AuthScreen gap={28} backLabel="رجوع لتسجيل الدخول">
        <View style={styles.sent}>
          <View style={styles.sentIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <MailIcon color={Brand.success} size={44} />
          </View>
          <View style={styles.sentText}>
            <Text style={styles.sentTitle} accessibilityRole="header">
              تحقّق من بريدك
            </Text>
            {/* Firebase doesn't reveal whether an email is registered, so this can't either. */}
            <Text style={styles.sentBody}>إذا كان هذا البريد مسجّلًا، أرسلنا رابط إعادة التعيين إلى</Text>
            <Text style={styles.sentEmail}>{sentTo}</Text>
          </View>
          <View style={styles.sentButton}>
            <AuthButton title="العودة لتسجيل الدخول" onPress={backToSignIn} tall />
          </View>
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>لم يصلك البريد؟</Text>
            <Pressable
              onPress={() => send(sentTo)}
              disabled={cooldown > 0 || submitting}
              accessibilityRole="button"
              accessibilityState={{ disabled: cooldown > 0 || submitting }}
              hitSlop={8}>
              <Text style={[styles.resendLink, (cooldown > 0 || submitting) && styles.disabled]}>
                {cooldown > 0 ? `إعادة الإرسال (${toArabicDigits(cooldown)})` : 'إعادة الإرسال'}
              </Text>
            </Pressable>
          </View>
          <AuthErrorText message={error} />
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen gap={28} backLabel="رجوع لتسجيل الدخول">
      <View style={styles.ask}>
        <View style={styles.askIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <KeyIcon color={Brand.link} size={34} />
        </View>
        <View style={styles.askText}>
          <Text style={styles.askTitle} accessibilityRole="header">
            نسيت كلمة المرور؟
          </Text>
          <Text style={styles.askBody}>أدخل بريدك الإلكتروني المسجّل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</Text>
        </View>
        <View style={styles.form}>
          <AuthTextField
            label="البريد الإلكتروني"
            icon={MailIcon}
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          <AuthButton title="إرسال رابط إعادة التعيين" onPress={submit} loading={submitting} tall />
          <AuthErrorText message={error} />
        </View>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  ask: {
    gap: 24,
  },
  askIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askText: {
    gap: 8,
  },
  askTitle: {
    fontSize: 26,
    lineHeight: 38,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  askBody: {
    fontSize: 15,
    lineHeight: 27,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  form: {
    gap: 16,
  },
  sent: {
    alignItems: 'center',
    gap: 20,
    paddingTop: 40,
  },
  sentIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(16,185,129,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 10px rgba(16,185,129,0.08)',
  },
  sentText: {
    alignItems: 'center',
    gap: 8,
  },
  sentTitle: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
    textAlign: 'center',
  },
  sentBody: {
    fontSize: 15,
    lineHeight: 27,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
  sentEmail: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Brand.text,
    textAlign: 'center',
  },
  sentButton: {
    alignSelf: 'stretch',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Brand.link,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});
