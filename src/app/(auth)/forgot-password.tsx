import { router } from 'expo-router';
import { useState } from 'react';

import { FormMessage } from '@/components/form-message';
import { FormScreen } from '@/components/form-screen';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { sendPasswordReset } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError('أدخل البريد الإلكتروني');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreen
      title="نسيت كلمة المرور؟"
      subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.">
      <TextField
        label="البريد الإلكتروني"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setSent(false);
        }}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      <FormMessage message={error} />
      {/* Firebase doesn't reveal whether an email is registered, so the message can't either. */}
      <FormMessage
        tone="success"
        message={sent ? 'إذا كان البريد مسجّلًا، ستصلك رسالة لإعادة تعيين كلمة المرور. تحقق من صندوق الوارد والرسائل غير المرغوب فيها.' : null}
      />
      {sent ? (
        <PrimaryButton title="العودة لتسجيل الدخول" onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))} />
      ) : (
        <PrimaryButton title="إرسال رابط إعادة التعيين" onPress={submit} loading={submitting} />
      )}
    </FormScreen>
  );
}
