import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Rarity } from '../../types';
import { RARITY_COLORS } from '../../theme';

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const color = RARITY_COLORS[rarity];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{rarity.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
