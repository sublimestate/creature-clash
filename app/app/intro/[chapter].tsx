import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CHAPTERS, firstStageIdOfChapter } from '../../src/data/chapters';
import { usePlayerStore } from '../../src/stores/playerStore';
import { COLORS } from '../../src/theme';

const LINE_DELAY_MS = 700;
const LINE_FADE_MS = 600;

export default function IntroScreen() {
  const { chapter: chapterParam } = useLocalSearchParams<{ chapter: string }>();
  const chapter = Number(chapterParam);
  const intro = CHAPTERS[chapter];

  const markSeen = usePlayerStore((s) => s.markChapterIntroSeen);
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    if (!intro) return;
    // Reveal the Continue button after the last line has faded in.
    const totalDelay = intro.lines.length * LINE_DELAY_MS + LINE_FADE_MS;
    const timer = setTimeout(() => setShowContinue(true), totalDelay);
    return () => clearTimeout(timer);
  }, [intro]);

  if (!intro) {
    return (
      <View style={styles.container}>
        <Text style={styles.fallback}>No story for this chapter yet.</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleContinue = () => {
    markSeen(intro.number);
    const stageId = firstStageIdOfChapter(intro.number);
    if (stageId) router.replace(`/preview/${stageId}`);
    else router.back();
  };

  const handleSkip = () => {
    markSeen(intro.number);
    const stageId = firstStageIdOfChapter(intro.number);
    if (stageId) router.replace(`/preview/${stageId}`);
    else router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <View style={[styles.accentBar, { backgroundColor: intro.accent }]} />

      <Pressable onPress={handleSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip ›</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: intro.accent }]}>
          {intro.subtitle.toUpperCase()}
        </Text>
        <Text style={styles.title}>{intro.title}</Text>

        <View style={styles.divider} />

        <View style={styles.lines}>
          {intro.lines.map((line, i) => (
            <FadeInLine key={i} text={line} delay={i * LINE_DELAY_MS} />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {showContinue && (
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: intro.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>Begin</Text>
          </Pressable>
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

  return (
    <Animated.Text style={[styles.line, style]}>{text}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  accentBar: { height: 4 },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 6,
    zIndex: 1,
  },
  skipText: { color: COLORS.textDim, fontWeight: '700', fontSize: 12 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 100,
    gap: 12,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0.5,
    lineHeight: 40,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
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
    minHeight: 100,
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
  fallback: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 200,
    paddingHorizontal: 24,
  },
});
