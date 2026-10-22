import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Brand, Colors } from '@/constants/colors';
import { CairoFonts } from '@/constants/fonts';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.background, primary: Colors.primary },
};

// Repeated per screen: native-stack screens are hosted in their own native containers, so the
// root's direction may not reach them.
const rtl = { direction: 'rtl' } as const;

// Screens built from the new dark designs draw their own header (or none).
const darkScreenOptions = { headerShown: false, contentStyle: { ...rtl, backgroundColor: Brand.background } };

export default function RootLayout() {
  return (
    // RTL: the expo-localization plugin (app.json) forces it in native builds, but Expo Go ignores
    // config plugins, so the root also sets `direction: 'rtl'`, which every screen inherits.
    // +html.tsx covers web.
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={theme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// The native splash stays up until the stored session, the guest choice and the fonts are known;
// otherwise the first screen could flash welcome before switching to home. AnimatedSplashOverlay
// hides the native splash once it mounts.
function AppContent() {
  const { restoring } = useAuth();
  const [fontsLoaded, fontError] = useFonts(CairoFonts);

  if (restoring || (!fontsLoaded && !fontError)) return null;

  return (
    <>
      <AnimatedSplashOverlay />
      <RootStack />
    </>
  );
}

// Exams are public; only the welcome and account screens depend on auth state. When a guard
// turns false (e.g. right after signing in) Expo Router leaves those screens and returns to the
// first allowed one: welcome for signed-out users, otherwise `index`.
function RootStack() {
  const { user, profile, initializing, isGuest } = useAuth();
  const showWelcome = !user && !isGuest;

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.text, fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: rtl,
      }}>
      <Stack.Protected guard={showWelcome}>
        <Stack.Screen name="welcome" options={{ ...darkScreenOptions, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!showWelcome}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Not guarded, so links to grades and exams work for everyone. */}
      <Stack.Screen name="grades/index" options={{ title: 'الصفوف' }} />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)/sign-in" options={darkScreenOptions} />
        <Stack.Screen name="(auth)/sign-up" options={darkScreenOptions} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: 'استعادة كلمة المرور' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !initializing && !profile}>
        <Stack.Screen name="complete-profile" options={{ title: 'أكمل بياناتك' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    direction: 'rtl',
  },
});
