import { router } from 'expo-router';

import { FormScreen } from '@/components/form-screen';
import { ProfileForm } from '@/components/profile-form';
import { useAuth } from '@/hooks/use-auth';
import { updateStudentProfile, type ProfileFields } from '@/lib/auth-actions';

/** Change name, grade or section. Only reachable with a profile (see the root layout's guard). */
export default function EditProfileScreen() {
  const { profile } = useAuth();
  if (!profile) return null;

  async function save(fields: ProfileFields) {
    await updateStudentProfile(fields);
    router.back();
  }

  return (
    <FormScreen title="تعديل البيانات" subtitle="غيّر صفك أو شعبتك لتظهر لك امتحاناتها في الرئيسية.">
      <ProfileForm
        initial={{ name: profile.name, gradeId: profile.gradeId ?? '', sectionId: profile.sectionId ?? '' }}
        onSubmit={save}
      />
    </FormScreen>
  );
}
