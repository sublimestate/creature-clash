import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { setAudioModeAsync } from 'expo-audio';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { soundManager } from '../src/audio/SoundManager';
import { useAuthStore } from '../src/cloud/authStore';
import { initCloudSync } from '../src/cloud/sync';
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
    // iOS: don't go silent when the ring switch is on; mix with other audio.
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    soundManager.init();
    // Boot cloud-sync. No-ops when env vars aren't configured.
    useAuthStore.getState().init().catch(() => {});
    initCloudSync();
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
