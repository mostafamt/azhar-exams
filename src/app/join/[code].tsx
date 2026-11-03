import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthButton } from '@/components/auth-button';
import { Brand } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { joinByCode } from '@/data/matches';
import { useAuth } from '@/hooks/use-auth';
import { useLightStatusBar } from '@/hooks/use-light-status-bar';
import { JOIN_ERRORS } from '@/hooks/use-room';

function home() {
  router.replace('/');
}

/**
 * Deep link from a shared room code: azharexams://join/K7P2QX joins that room and opens the match.
 * Not behind the account guard, so a signed-out student gets a way to sign in instead of a dead end.
 */
export default function JoinByLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const { user, profile, initializing } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Join once, even if the effect runs twice.
  const started = useRef(false);
  useLightStatusBar();

  const ready = !initializing && !!user && !!profile;
  useEffect(() => {
    if (!ready || !user || !profile || started.current) return;
    started.current = true;
    joinByCode({ uid: user.uid, name: profile.name }, code ?? '')
      .then((result) => {
        if ('matchId' in result) router.replace({ pathname: '/match/[id]', params: { id: result.matchId } });
        else setError(JOIN_ERRORS[result.error]);
      })
      .catch(() => setError('تعذّر الاتصال، تحقق من اتصالك بالإنترنت.'));
  }, [ready, user, profile, code]);

  let body;
  if (initializing) body = <ActivityIndicator size="large" color={Brand.link} />;
  else if (!user) {
    body = (
      <>
        <Text style={styles.message}>سجّل الدخول لتنضم إلى مباراة صديقك.</Text>
        <AuthButton title="تسجيل الدخول" onPress={() => router.push('/sign-in')} />
        <AuthButton title="الرئيسية" variant="outline" onPress={home} />
      </>
    );
  } else if (!profile) {
    body = (
      <>
        <Text style={styles.message}>أكمل بياناتك أولاً، ثم افتح الرابط مرة أخرى.</Text>
        <AuthButton title="أكمل بياناتك" onPress={() => router.replace('/complete-profile')} />
      </>
    );
  } else if (error) {
    body = (
      <>
        <Text style={styles.message}>{error}</Text>
        <AuthButton title="الرئيسية" variant="outline" onPress={home} />
      </>
    );
  } else {
    body = (
      <>
        <ActivityIndicator size="large" color={Brand.link} />
        <Text style={styles.message}>جارٍ الانضمام إلى الغرفة {code}…</Text>
      </>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.column}>{body}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: Brand.background,
  },
  // Phone width on large screens (web), centered.
  column: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'stretch',
    gap: 14,
  },
  message: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Fonts.semiBold,
    color: Brand.text,
    textAlign: 'center',
  },
});
