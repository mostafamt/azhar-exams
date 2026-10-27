import { FormScreen } from '@/components/form-screen';
import { ProfileForm } from '@/components/profile-form';
import { useAuth } from '@/hooks/use-auth';
import { createProfile } from '@/lib/auth-actions';

/**
 * For a signed-in user without users/{uid}, e.g. when the connection dropped right after the
 * account was created. Once the profile exists the root layout's guard returns to home.
 */
export default function CompleteProfileScreen() {
  const { user } = useAuth();

  return (
    <FormScreen title="أكمل بياناتك" subtitle="اختر صفك وشعبتك لنعرض لك موادك مباشرة.">
      <ProfileForm initial={{ name: user?.displayName ?? '', gradeId: '', sectionId: '' }} onSubmit={createProfile} />
    </FormScreen>
  );
}
