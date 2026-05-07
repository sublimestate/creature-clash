import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../theme';

interface Props {
  hp: number;
  maxHp: number;
  width?: number;
  showText?: boolean;
}

export function HealthBar({ hp, maxHp, width = 80, showText }: Props) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const w = useSharedValue(pct);

  useEffect(() => {
    w.value = withTiming(pct, { duration: 350 });
  }, [pct, w]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${w.value * 100}%`,
  }));

  const color =
    pct > 0.5 ? COLORS.hp : pct > 0.25 ? COLORS.hpLow : COLORS.hpCritical;

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.bar}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
      {showText && (
        <Text style={styles.text}>
          {hp} / {maxHp}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  bar: {
    height: 8,
    backgroundColor: COLORS.bgElev,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  text: { color: COLORS.text, fontSize: 10, textAlign: 'center', fontWeight: '700' },
});
