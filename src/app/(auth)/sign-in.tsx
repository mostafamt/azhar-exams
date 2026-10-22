import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-text-field';
import { Checkbox } from '@/components/checkbox';
import { BackIcon, GoogleBadge, LockIcon, MailIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/use-auth';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { signIn } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

// Design: docs/1a · Email Login-html. On success the root layout's guards remove the (auth)
// screens and return to home.
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const google = useGoogleSignIn();
  useLightStatusBar();

  async function submit() {
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password, remember);
    } catch (e) {
      setError(authErrorMessage(e));
      setSubmitting(false);
    }
  }

  // Opened from a link with no history: go to the start screen instead. Replacing with a
  // protected screen is ignored, so pick the one the root layout allows (signed out here).
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(isGuest ? '/' : '/welcome');
  }

  const message = error ?? google.error;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(20, insets.top + 8), paddingBottom: Math.max(28, insets.bottom + 12) },
        ]}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.back}>
          <BackIcon color={Brand.text} size={20} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            أهلاً بعودتك
          </Text>
          <Text style={styles.subtitle}>سجّل الدخول لمتابعة تقدّمك في الدوريات</Text>
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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
          <AuthTextField
            ref={passwordRef}
            label="كلمة المرور"
            icon={LockIcon}
            password
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.options}>
            <Checkbox label="تذكّرني" checked={remember} onChange={setRemember} />
            <Pressable onPress={() => router.push('/forgot-password')} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.forgot}>نسيت كلمة المرور؟</Text>
            </Pressable>
          </View>
          <AuthButton title="تسجيل الدخول" onPress={submit} loading={submitting} />
          {message ? (
            <Text style={styles.error} accessibilityRole="alert">
              {message}
            </Text>
          ) : null}
        </View>

        <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>

        <AuthButton
          title="المتابعة باستخدام Google"
          variant="outline"
          onPress={google.signIn}
          loading={google.loading}
          icon={<GoogleBadge size={24} />}
        />

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>ليس لديك حساب؟</Text>
          <Pressable onPress={() => router.replace('/sign-up')} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.footerLink}>إنشاء حساب</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  back: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 38,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  form: {
    gap: 16,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgot: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Brand.link,
    paddingVertical: 10,
  },
  error: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.error,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Brand.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  footerLink: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Brand.link,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
