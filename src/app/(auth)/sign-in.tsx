import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { AuthErrorText, AuthScreen, OrDivider } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { Checkbox } from '@/components/checkbox';
import { GoogleBadge, LockIcon, MailIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';
import { signIn } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

// Design: docs/1a · Email Login-html. On success the root layout's guards remove the (auth)
// screens and return to home.
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const google = useGoogleSignIn();

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

  return (
    <AuthScreen
      title="أهلاً بعودتك"
      subtitle="سجّل الدخول لمتابعة تقدّمك في الدوريات"
      gap={24}
      footer={{ prompt: 'ليس لديك حساب؟', action: 'إنشاء حساب', onPress: () => router.replace('/sign-up') }}>
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
        <AuthButton title="تسجيل الدخول" onPress={submit} loading={submitting} tall />
        <AuthErrorText message={error ?? google.error} />
      </View>

      <OrDivider />

      <AuthButton
        title="المتابعة باستخدام Google"
        variant="outline"
        onPress={google.signIn}
        loading={google.loading}
        icon={<GoogleBadge size={24} />}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
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
});
