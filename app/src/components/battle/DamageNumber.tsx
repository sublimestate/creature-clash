import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../theme';
import { Effectiveness } from '../../types';

interface Props {
  value: number;
  kind?: 'damage' | 'heal' | 'miss';
  effectiveness?: Effectiveness;
  visible: boolean;
}

export function DamageNumber({ value, kind = 'damage', effectiveness, visible }: Props) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      y.value = 0;
      opacity.value = 1;
      scale.value = 0.8;
      scale.value = withTiming(1.2, { duration: 120 });
      y.value = withTiming(-30, { duration: 700 });
      opacity.value = withTiming(0, { duration: 700 });
    }
  }, [visible, value, y, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const color =
    kind === 'heal'
      ? COLORS.good
      : effectiveness === 'super'
      ? COLORS.accent
      : effectiveness === 'weak'
      ? COLORS.textDim
      : COLORS.text;

  const text =
    kind === 'heal'
      ? `+${Math.abs(value)}`
      : kind === 'miss'
      ? 'Miss!'
      : `${value}`;

  return (
    <Animated.Text
      style={[styles.text, { color, pointerEvents: 'none' }, style]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
