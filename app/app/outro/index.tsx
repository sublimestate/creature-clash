import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../src/theme';

const LINE_DELAY_MS = 800;
const LINE_FADE_MS = 700;

// Shown once after defeating the final boss. The player will not see
// this again unless they reset.
const LINES = [
  'The owl folds her wings. The park goes quiet.',
  'You walk home with a pack that wasn\'t yours a season ago.',
  'Three neighborhoods. Three understandings.',
  'Somewhere past the park there\'s a riverbed. The strays talk about it sometimes.',
];

export default function OutroScreen() {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t = setTimeout(
      () => setShowButton(true),
      LINES.length * LINE_DELAY_MS + LINE_FADE_MS,
    );
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.accentBar, { backgroundColor: COLORS.accent }]} />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>CHAPTER 3 — CLEARED</Text>
        <Text style={styles.title}>The park is yours.</Text>
        <View style={styles.divider} />

        <View style={styles.lines}>
          {LINES.map((line, i) => (
            <FadeInLine key={i} text={line} delay={i * LINE_DELAY_MS} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {showButton && (
          <>
            <Text style={styles.teaser}>More chapters coming soon.</Text>
            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.buttonLabel}>Back home</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function FadeInLine({ text, delay }: { text: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: LINE_FADE_MS }));
    translateY.value = withDelay(delay, withTiming(0, { duration: LINE_FADE_MS }));
  }, [delay, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={[styles.line, style]}>{text}</Animated.Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  accentBar: { height: 4 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 120,
    gap: 12,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 24,
    width: 60,
  },
  lines: { gap: 18 },
  line: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  footer: {
    padding: 28,
    paddingBottom: 48,
    minHeight: 120,
    gap: 12,
  },
  teaser: {
    color: COLORS.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonLabel: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
});
