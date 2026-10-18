import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/colors';
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
          <AnimatedSplashOverlay />
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Exams are public; only the account screens depend on auth state. When a guard turns false
// (e.g. right after signing in) Expo Router leaves those screens and returns to `index`.
function RootStack() {
  const { user, profile, initializing } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.text, fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
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
