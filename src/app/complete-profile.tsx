import { useState } from 'react';

import { FormMessage } from '@/components/form-message';
import { FormScreen } from '@/components/form-screen';
import { GradeSectionPicker } from '@/components/grade-section-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { useAuth } from '@/hooks/use-auth';
import { createProfile } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

/**
 * For a signed-in user without users/{uid}, e.g. when the connection dropped right after the
 * account was created. Once the profile exists the root layout's guard returns to home.
 */
export default function CompleteProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? '');
  const [place, setPlace] = useState({ gradeId: '', sectionId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return setError('أدخل اسمك');
    if (!place.gradeId || !place.sectionId) return setError('اختر الصف والشعبة');
    setSubmitting(true);
    setError(null);
    try {
      await createProfile({ name, ...place });
    } catch (e) {
      setError(authErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <FormScreen title="أكمل بياناتك" subtitle="اختر صفك وشعبتك لنعرض لك موادك مباشرة.">
      <TextField label="الاسم" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <GradeSectionPicker value={place} onChange={setPlace} />
      <FormMessage message={error} />
      <PrimaryButton title="حفظ" onPress={submit} loading={submitting} />
    </FormScreen>
  );
}
