import { Link, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { VerifyEmailBanner } from '@/components/verify-email-banner';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from '@/lib/auth-actions';

export default function HomeScreen() {
  const { user, profile, initializing } = useAuth();

  // Signed-in students go straight to their own grade and section; everyone else picks one.
  function start() {
    if (profile?.gradeId) {
      router.push({ pathname: '/grades/[gradeId]', params: { gradeId: profile.gradeId, section: profile.sectionId } });
    } else {
      router.push('/grades');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>امتحانات الثانوية الأزهرية 📚</Text>
        <Text style={styles.subtitle}>المواد الشرعية والعربية - الصف الثالث الثانوي</Text>

        {user && (
          <View style={styles.account}>
            <Text style={styles.greeting}>مرحبًا، {profile?.name ?? user.displayName ?? ''}</Text>
            <VerifyEmailBanner />
            {!initializing && !profile && (
              <Link href="/complete-profile" style={styles.link}>
                أكمل بياناتك لاختيار صفك وشعبتك
              </Link>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton title="ابدأ المذاكرة الآن" onPress={start} />
          {initializing ? (
            <ActivityIndicator color={Colors.primary} />
          ) : user ? (
            <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8} style={styles.signOut}>
              <Text style={styles.signOutText}>تسجيل الخروج</Text>
            </Pressable>
          ) : (
            <>
              <PrimaryButton title="تسجيل الدخول" onPress={() => router.push('/sign-in')} secondary />
              <Text style={styles.hint}>الحساب اختياري — يمكنك تصفح الامتحانات بدونه.</Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  account: {
    maxWidth: 480,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  greeting: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  link: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  actions: {
    maxWidth: 480,
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
