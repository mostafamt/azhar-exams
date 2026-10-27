import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
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

// iOS/Android only (web gets dir="rtl" from +html.tsx and rejects this style). Repeated per
// screen: native-stack screens are hosted in their own native containers, so the root's
// direction may not reach them.
const rtl: ViewStyle = Platform.OS === 'web' ? {} : { direction: 'rtl' };

// Screens built from the new dark designs draw their own header (or none).
const darkScreenOptions = { headerShown: false, contentStyle: { ...rtl, backgroundColor: Brand.background } };

export default function RootLayout() {
  return (
    // RTL: the expo-localization plugin (app.json) forces it in native builds, but Expo Go ignores
    // config plugins, so the root also sets `direction: 'rtl'`, which every screen inherits.
    // +html.tsx covers web.
    <GestureHandlerRootView style={[styles.root, rtl]}>
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
        <Stack.Screen name="(tabs)" options={darkScreenOptions} />
      </Stack.Protected>
      {/* Not guarded, so links to grades and exams work for everyone. */}
      <Stack.Screen name="grades/index" options={{ title: 'الصفوف' }} />
      {/* No swipe back: leaving a running test goes through its confirm dialog. */}
      <Stack.Screen
        name="quick-test"
        options={{ ...darkScreenOptions, gestureEnabled: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)/sign-in" options={darkScreenOptions} />
        <Stack.Screen name="(auth)/sign-up" options={darkScreenOptions} />
        <Stack.Screen name="(auth)/forgot-password" options={darkScreenOptions} />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !initializing && !profile}>
        <Stack.Screen name="complete-profile" options={{ title: 'أكمل بياناتك' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !!profile}>
        <Stack.Screen name="edit-profile" options={{ title: 'تعديل البيانات' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
