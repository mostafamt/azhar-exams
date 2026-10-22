import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackIcon } from '@/components/icons';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/use-auth';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';

type Props = {
  title: string;
  subtitle: string;
  /** Space between the blocks; the designs use 24 (sign-in) and 20 (sign-up). */
  gap: number;
  /** Bottom line, e.g. «ليس لديك حساب؟ إنشاء حساب». */
  footer: { prompt: string; action: string; onPress: () => void };
  children: ReactNode;
};

/**
 * Frame of the dark auth designs (docs/1a, 1b): back button, title, the screen's content, then
 * the footer pinned to the bottom. Scrolls and avoids the keyboard on small screens.
 */
export function AuthScreen({ title, subtitle, gap, footer, children }: Props) {
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  useLightStatusBar();

  // Opened from a link with no history: go to the start screen instead. Replacing with a
  // protected screen is ignored, so pick the one the root layout allows (signed out here).
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(isGuest ? '/' : '/welcome');
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { gap, paddingTop: Math.max(20, insets.top + 8), paddingBottom: Math.max(24, insets.bottom + 12) },
        ]}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.back}>
          <BackIcon color={Brand.text} size={20} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {children}

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footer.prompt}</Text>
          <Pressable onPress={footer.onPress} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.footerLink}>{footer.action}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** «أو» between two lines. */
export function OrDivider() {
  return (
    <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>أو</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

/** Red line for a Firebase or form error on the dark screens. */
export function AuthErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {message}
    </Text>
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
  },
  back: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 38,
    fontFamily: Fonts.extraBold,
    color: Brand.text,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Brand.textMuted,
  },
  footerLink: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Brand.link,
    paddingVertical: 10,
    paddingHorizontal: 4,
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
});
