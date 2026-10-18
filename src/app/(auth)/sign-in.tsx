import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FormMessage } from '@/components/form-message';
import { FormScreen } from '@/components/form-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { Colors } from '@/constants/colors';
import { signIn } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

// On success the root layout's guard removes the (auth) screens and returns to home.
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <FormScreen title="تسجيل الدخول" subtitle="سجّل الدخول لحفظ صفك وشعبتك والوصول السريع لموادك.">
      <TextField
        label="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label="كلمة المرور"
        password
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Link href="/forgot-password" style={styles.link}>
        نسيت كلمة المرور؟
      </Link>
      <FormMessage message={error} />
      <PrimaryButton title="دخول" onPress={submit} loading={submitting} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>ليس لديك حساب؟</Text>
        <Link href="/sign-up" replace style={styles.link}>
          إنشاء حساب جديد
        </Link>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
