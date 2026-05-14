import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../src/cloud/authStore';
import { COLORS } from '../../src/theme';

// Magic-link landing page. The Supabase client's detectSessionInUrl picks up
// the auth hash on web load before this component mounts; once the auth
// store flips to signed_in we bounce home.
export default function AuthCallbackScreen() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'signed_in') {
      const t = setTimeout(() => router.replace('/'), 400);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.accent} />
      <Text style={styles.text}>
        {status === 'signed_in' ? 'Signed in. Returning…' : 'Signing you in…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: { color: COLORS.text, fontSize: 14 },
});
