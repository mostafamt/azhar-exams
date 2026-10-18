import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FormMessage } from '@/components/form-message';
import { FormScreen } from '@/components/form-screen';
import { GradeSectionPicker } from '@/components/grade-section-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { Colors } from '@/constants/colors';
import { signUp } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'place', string>>;

function validate(form: { name: string; email: string; password: string; confirm: string; gradeId: string; sectionId: string }) {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'أدخل اسمك';
  else if (form.name.trim().length > 100) errors.name = 'الاسم طويل جدًا';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'البريد الإلكتروني غير صالح';
  if (form.password.length < 6) errors.password = 'كلمة المرور ٦ أحرف على الأقل';
  if (form.confirm !== form.password) errors.confirm = 'كلمتا المرور غير متطابقتين';
  if (!form.gradeId || !form.sectionId) errors.place = 'اختر الصف والشعبة';
  return errors;
}

// On success the user is signed in, so the root layout's guard returns to home.
export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [place, setPlace] = useState({ gradeId: '', sectionId: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  async function submit() {
    const nextErrors = validate({ name, email, password, confirm, ...place });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ name, email, password, ...place });
    } catch (e) {
      setError(authErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <FormScreen title="إنشاء حساب جديد" subtitle="سنرسل لك رسالة لتأكيد بريدك الإلكتروني.">
      <TextField
        label="الاسم"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={emailRef}
        label="البريد الإلكتروني"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
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
        error={errors.password}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={confirmRef}
        label="تأكيد كلمة المرور"
        password
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
      />
      <GradeSectionPicker value={place} onChange={setPlace} error={errors.place} />
      <FormMessage message={error} />
      <PrimaryButton title="إنشاء الحساب" onPress={submit} loading={submitting} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>لديك حساب بالفعل؟</Text>
        <Link href="/sign-in" replace style={styles.link}>
          تسجيل الدخول
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
