import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CREATURES_BY_ID } from '../../data/creatures';
import { OwnedCreature } from '../../types';
import { COLORS, RARITY_COLORS, RARITY_GLOW } from '../../theme';
import { CreatureSprite } from '../common/CreatureSprite';
import { RarityBadge } from '../common/RarityBadge';

interface Props {
  owned: OwnedCreature;
  onPress?: () => void;
  selected?: boolean;
  inTeam?: boolean;
  small?: boolean;
}

export function CreatureCard({ owned, onPress, selected, inTeam, small }: Props) {
  const def = CREATURES_BY_ID[owned.creatureId];
  if (!def) return null;
  const rarityColor = RARITY_COLORS[def.rarity];
  const glow = RARITY_GLOW[def.rarity];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? COLORS.accent : rarityColor,
          backgroundColor: glow,
          opacity: pressed ? 0.85 : 1,
        },
        small && styles.cardSmall,
      ]}
    >
      <CreatureSprite
        creatureId={def.id}
        type={def.type}
        size={small ? 48 : 60}
      />
      <View style={styles.info}>
        <Text numberOfLines={1} style={styles.name}>
          {def.name}
        </Text>
        <Text style={styles.lvl}>Lv {owned.level}</Text>
        <RarityBadge rarity={def.rarity} />
      </View>
      {inTeam && (
        <View style={styles.teamPin}>
          <Text style={styles.teamPinText}>★</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  cardSmall: {
    padding: 6,
    gap: 8,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: { color: COLORS.text, fontWeight: '800', fontSize: 14 },
  lvl: { color: COLORS.textDim, fontSize: 12 },
  teamPin: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamPinText: { color: COLORS.bg, fontWeight: '900', fontSize: 11 },
});
