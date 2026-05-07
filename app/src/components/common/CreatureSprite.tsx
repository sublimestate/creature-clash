import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CreatureType } from '../../types';
import { TYPE_COLORS } from '../../engine/types';
import { SPRITES } from '../../data/pixelSprites';
import { PixelSprite } from './PixelSprite';

interface Props {
  creatureId: string;
  type: CreatureType;
  size?: number;
  fainted?: boolean;
  flip?: boolean;
}

// Renders a creature avatar. If a hand-drawn pixel sprite exists for the
// creature it's used; otherwise we fall back to a colored block with the
// creature's initial (so creatures that haven't been drawn yet still show
// up rather than rendering nothing).
export function CreatureSprite({
  creatureId,
  type,
  size = 64,
  fainted,
  flip,
}: Props) {
  if (SPRITES[creatureId]) {
    return (
      <PixelSprite
        creatureId={creatureId}
        size={size}
        fainted={fainted}
        flip={flip}
      />
    );
  }

  const initial = creatureId.charAt(0).toUpperCase();
  const color = TYPE_COLORS[type];
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          backgroundColor: color,
          opacity: fainted ? 0.25 : 1,
          transform: [{ scaleX: flip ? -1 : 1 }],
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  letter: {
    color: 'white',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
