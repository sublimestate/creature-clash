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
  isCrit?: boolean;
  visible: boolean;
}

export function DamageNumber({
  value,
  kind = 'damage',
  effectiveness,
  isCrit,
  visible,
}: Props) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      y.value = 0;
      opacity.value = 1;
      scale.value = 0.8;
      scale.value = withTiming(isCrit ? 1.55 : 1.2, { duration: 120 });
      y.value = withTiming(-30, { duration: 700 });
      opacity.value = withTiming(0, { duration: 700 });
    }
  }, [visible, value, isCrit, y, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const color =
    kind === 'miss'
      ? COLORS.textDim
      : kind === 'heal'
      ? COLORS.good
      : isCrit
      ? COLORS.accent
      : effectiveness === 'super'
      ? COLORS.accent
      : effectiveness === 'weak'
      ? COLORS.textDim
      : COLORS.text;

  const fontSize = isCrit ? 24 : 18;

  let text: string;
  if (kind === 'heal') text = `+${Math.abs(value)}`;
  else if (kind === 'miss') text = 'MISS!';
  else if (isCrit) text = `${value}!`;
  else text = `${value}`;

  return (
    <Animated.Text
      style={[
        styles.text,
        { color, fontSize, pointerEvents: 'none' },
        style,
      ]}
    >
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
