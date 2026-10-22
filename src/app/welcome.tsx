import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { BrandLogo } from '@/components/brand-logo';
import { FeatureCarousel } from '@/components/feature-carousel';
import { GoogleBadge, MailIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/use-auth';
import { useGoogleSignIn } from '@/hooks/use-google-sign-in';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';

/**
 * First screen for signed-out users who haven't chosen to browse as a guest. Signing in or
 * continuing as a guest flips the root layout's guard, which replaces this screen with home.
 */
export default function WelcomeScreen() {
  const { continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const google = useGoogleSignIn();
  useLightStatusBar();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(48, insets.top + 16), paddingBottom: Math.max(24, insets.bottom + 8) },
      ]}>
      <View style={styles.header}>
        <BrandLogo />
        <Text style={styles.appName} accessibilityRole="header">
          نوابغ الأزهر
        </Text>
        <Text style={styles.tagline}>تنافس، تعلّم، وتصدّر القمة</Text>
      </View>

      <View style={styles.middle}>
        <FeatureCarousel />
      </View>

      <View style={styles.actions}>
        <AuthButton
          title="المتابعة باستخدام Google"
          onPress={google.signIn}
          loading={google.loading}
          icon={<GoogleBadge />}
        />
        <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>
        <AuthButton
          title="إنشاء حساب بالبريد الإلكتروني"
          variant="outline"
          onPress={() => router.push('/sign-up')}
          icon={<MailIcon color={Brand.link} size={20} />}
        />
        {google.error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {google.error}
          </Text>
        ) : null}
        <View style={styles.signInRow}>
          <Text style={styles.muted}>لديك حساب بالفعل؟</Text>
          <Pressable onPress={() => router.push('/sign-in')} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.signInLink}>تسجيل الدخول</Text>
          </Pressable>
        </View>
        <Pressable onPress={continueAsGuest} accessibilityRole="button" style={styles.guest}>
          <Text style={styles.guestText}>التصفح كزائر</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    gap: 22,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 32,
    lineHeight: 42,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Brand.accent,
    textAlign: 'center',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Brand.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  error: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Brand.error,
    textAlign: 'center',
  },
  signInRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  muted: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  signInLink: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Brand.link,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  guest: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Brand.textMuted,
    textDecorationLine: 'underline',
  },
});
