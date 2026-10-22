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

export default function RootLayout() {
  return (
    // RTL is forced natively by the expo-localization plugin (app.json); +html.tsx covers web.
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
      }}>
      <Stack.Protected guard={showWelcome}>
        <Stack.Screen
          name="welcome"
          options={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: Brand.background } }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!showWelcome}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Not guarded, so links to grades and exams work for everyone. */}
      <Stack.Screen name="grades/index" options={{ title: 'الصفوف' }} />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)/sign-in" options={{ title: 'تسجيل الدخول' }} />
        <Stack.Screen name="(auth)/sign-up" options={{ title: 'إنشاء حساب' }} />
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
  },
});
