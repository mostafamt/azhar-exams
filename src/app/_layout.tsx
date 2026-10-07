import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/colors';

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
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerTitleAlign: 'center',
            headerTintColor: Colors.primary,
            headerTitleStyle: { color: Colors.text, fontWeight: '700' },
            headerBackButtonDisplayMode: 'minimal',
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="subjects/index" options={{ title: 'المواد' }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
