import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { UserIcon } from '@/components/icons';
import { VerifyEmailBanner } from '@/components/verify-email-banner';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useGrade, useSections } from '@/data/content';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from '@/lib/auth-actions';

/** Account details and sign-out; guests get a way back to sign in. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, initializing, leaveGuest } = useAuth();
  const grade = useGrade(profile?.gradeId ?? '');
  const sections = useSections(profile?.gradeId);
  const section = sections.data.find((s) => s.id === profile?.sectionId);
  const name = profile?.name ?? user?.displayName ?? null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
      <View style={styles.column}>
        <Text style={styles.title} accessibilityRole="header">
          حسابي
        </Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            {name?.trim() ? (
              <Text style={styles.initial}>{name.trim().charAt(0)}</Text>
            ) : (
              <UserIcon color={Brand.primaryPale} size={30} />
            )}
          </View>
          <Text style={styles.name}>{user ? name || 'طالب' : 'زائر'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>

        {user ? (
          <>
            <VerifyEmailBanner />
            {profile?.gradeId ? (
              <View style={styles.card}>
                <Row label="الصف" value={grade.data?.name ?? '…'} />
                <View style={styles.divider} />
                <Row label="الشعبة" value={section?.name ?? '…'} />
              </View>
            ) : (
              !initializing && (
                <Link href="/complete-profile" style={styles.link}>
                  أكمل بياناتك لاختيار صفك وشعبتك
                </Link>
              )
            )}
            <AuthButton title="تسجيل الخروج" variant="outline" onPress={signOut} />
          </>
        ) : (
          <>
            <Text style={styles.body}>سجّل الدخول لنحفظ صفك وشعبتك ونعرض امتحاناتك في الرئيسية مباشرة.</Text>
            <AuthButton title="تسجيل الدخول أو إنشاء حساب" onPress={leaveGuest} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 22,
  },
  title: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  identity: {
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
    backgroundColor: Brand.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 28,
    lineHeight: 42,
    fontFamily: Fonts.bold,
    color: Brand.primaryPale,
  },
  name: {
    fontSize: 20,
    lineHeight: 30,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  email: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  card: {
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.bold,
    color: Brand.text,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.border,
  },
  link: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.semiBold,
    color: Brand.link,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
