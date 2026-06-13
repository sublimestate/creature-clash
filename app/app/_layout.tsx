import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { initAudio, playBgm, unlockAudio } from '../src/audio';
import { COLORS } from '../src/theme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Theme music starts on the first user gesture — browser autoplay policy
  // keeps the AudioContext suspended until then, so every gesture re-syncs.
  useEffect(() => {
    void initAudio();
    playBgm('theme');
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: COLORS.bg,
      card: COLORS.bgElev,
      border: COLORS.border,
      primary: COLORS.accent,
      text: COLORS.text,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding/select-starter"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="intro/[chapter]"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="preview/[stageId]"
            options={{ animation: 'fade_from_bottom' }}
          />
          <Stack.Screen
            name="battle/[stageId]"
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="outro/index"
            options={{ animation: 'fade', presentation: 'fullScreenModal' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
