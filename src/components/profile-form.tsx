import { useState } from 'react';

import { FormMessage } from '@/components/form-message';
import { GradeSectionPicker } from '@/components/grade-section-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import type { ProfileFields } from '@/lib/auth-actions';
import { authErrorMessage } from '@/lib/auth-errors';

type Props = {
  initial: ProfileFields;
  /** Throws to show its error under the form. */
  onSubmit: (fields: ProfileFields) => Promise<void>;
};

/** Name, grade and section; shared by «أكمل بياناتك» and «تعديل البيانات». */
export function ProfileForm({ initial, onSubmit }: Props) {
  const [name, setName] = useState(initial.name);
  const [place, setPlace] = useState({ gradeId: initial.gradeId, sectionId: initial.sectionId });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return setError('أدخل اسمك');
    if (!place.gradeId || !place.sectionId) return setError('اختر الصف والشعبة');
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name, ...place });
    } catch (e) {
      setError(authErrorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <>
      <TextField label="الاسم" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <GradeSectionPicker value={place} onChange={setPlace} />
      <FormMessage message={error} />
      <PrimaryButton title="حفظ" onPress={submit} loading={submitting} />
    </>
  );
}
