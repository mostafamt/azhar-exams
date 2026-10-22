import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { AuthErrorText, AuthScreen } from '@/components/auth-screen';
import { AuthTextField } from '@/components/auth-text-field';
import { GradeSectionPicker } from '@/components/grade-section-picker';
import { LockIcon, MailIcon, UserIcon } from '@/components/icons';
import { signUp } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Firebase Auth's own minimum; the design's stricter rules aren't used.
const MIN_PASSWORD_LENGTH = 6;

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'place', string>>;

function validate(form: { name: string; email: string; password: string; confirm: string; gradeId: string; sectionId: string }) {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'أدخل اسمك';
  else if (form.name.trim().length > 100) errors.name = 'الاسم طويل جدًا';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'البريد الإلكتروني غير صالح';
  if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = 'كلمة المرور ٦ أحرف على الأقل';
  if (form.confirm !== form.password) errors.confirm = 'كلمتا المرور غير متطابقتين';
  if (!form.gradeId || !form.sectionId) errors.place = 'اختر الصف والشعبة';
  return errors;
}

// Design: docs/1b · Email Sign up-html, plus the grade/section picker that users/{uid} requires
// (docs/signup-plan.md). On success the user is signed in, so the root layout's guard returns to home.
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
    <AuthScreen
      title="إنشاء حساب جديد"
      subtitle="احفظ نتائجك ونافس في الدوريات"
      gap={20}
      footer={{ prompt: 'لديك حساب بالفعل؟', action: 'تسجيل الدخول', onPress: () => router.replace('/sign-in') }}>
      <View style={styles.form}>
        <AuthTextField
          compact
          label="الاسم الكامل"
          icon={UserIcon}
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder="مثال: أحمد علي"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
        <AuthTextField
          compact
          ref={emailRef}
          label="البريد الإلكتروني"
          icon={MailIcon}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <AuthTextField
          compact
          ref={passwordRef}
          label="كلمة المرور"
          icon={LockIcon}
          password
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint={errors.password ? undefined : '٦ أحرف على الأقل'}
          placeholder="••••••••"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          submitBehavior="submit"
        />
        <AuthTextField
          compact
          ref={confirmRef}
          label="تأكيد كلمة المرور"
          icon={LockIcon}
          password
          showToggle={false}
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          placeholder="••••••••"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
        />
        <GradeSectionPicker tone="dark" value={place} onChange={setPlace} error={errors.place} />
        <AuthButton title="إنشاء الحساب" onPress={submit} loading={submitting} tall />
        <AuthErrorText message={error} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
  },
});
