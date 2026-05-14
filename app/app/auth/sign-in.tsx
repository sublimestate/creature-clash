import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { playSfx } from '../../src/audio/SoundManager';
import { useAuthStore } from '../../src/cloud/authStore';
import { COLORS } from '../../src/theme';

export default function SignInScreen() {
  const configured = useAuthStore((s) => s.configured);
  const status = useAuthStore((s) => s.status);
  const sessionEmail = useAuthStore((s) => s.email);
  const sendMagicLink = useAuthStore((s) => s.sendMagicLink);
  const signOut = useAuthStore((s) => s.signOut);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSend = async () => {
    if (submitting) return;
    setSubmitting(true);
    setLocalError(null);
    playSfx('tap');
    const res = await sendMagicLink(email);
    setSubmitting(false);
    if (!res.ok) setLocalError(res.error ?? 'Could not send link.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            playSfx('tap');
            router.back();
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Cloud Save</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.body}>
        {!configured && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cloud save isn't set up</Text>
            <Text style={styles.cardBody}>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
              your environment, then restart the dev server. Your progress
              continues to save locally until then.
            </Text>
          </View>
        )}

        {configured && status === 'signed_in' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Signed in</Text>
            <Text style={styles.cardBody}>
              Backing up progress as <Text style={styles.email}>{sessionEmail}</Text>.
              Changes sync a few seconds after each save.
            </Text>
            <Pressable
              onPress={async () => {
                playSfx('tap');
                await signOut();
              }}
              style={[styles.button, styles.buttonSecondary]}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
                Sign out
              </Text>
            </Pressable>
          </View>
        )}

        {configured && status === 'awaiting_link' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Check your inbox</Text>
            <Text style={styles.cardBody}>
              We sent a magic link to <Text style={styles.email}>{sessionEmail}</Text>.
              Open it on this device to finish signing in.
            </Text>
            <Pressable
              onPress={() => {
                playSfx('tap');
                setEmail('');
                useAuthStore.setState({ status: 'signed_out', email: null });
              }}
              style={[styles.button, styles.buttonSecondary]}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
                Use a different email
              </Text>
            </Pressable>
          </View>
        )}

        {configured &&
          (status === 'signed_out' || status === 'idle') && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Back up your save</Text>
              <Text style={styles.cardBody}>
                Sign in with email to sync your progress across devices. We'll
                email you a one-tap sign-in link — no password.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
              {localError && (
                <Text style={styles.error}>{localError}</Text>
              )}
              <Pressable
                onPress={onSend}
                disabled={submitting}
                style={[
                  styles.button,
                  submitting && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.buttonText}>
                  {submitting ? 'Sending…' : 'Send magic link'}
                </Text>
              </Pressable>
            </View>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.bgElev,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 68,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  headerTitle: { color: COLORS.text, fontWeight: '900', fontSize: 16 },
  body: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: COLORS.accent, fontSize: 16, fontWeight: '900' },
  cardBody: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
  email: { color: COLORS.accent, fontWeight: '700' },
  input: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  buttonText: { color: COLORS.bg, fontWeight: '900', fontSize: 14 },
  buttonSecondaryText: { color: COLORS.text },
  error: { color: COLORS.danger, fontSize: 12 },
});
