import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { COLORS } from '../../theme';

export function CurrencyHeader() {
  const gold = usePlayerStore((s) => s.gold);
  const gems = usePlayerStore((s) => s.gems);
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={[styles.icon, { color: COLORS.goldText }]}>◆</Text>
        <Text style={styles.value}>{gold.toLocaleString()}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={[styles.icon, { color: COLORS.gemText }]}>♦</Text>
        <Text style={styles.value}>{gems.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  icon: { fontSize: 16, fontWeight: '900' },
  value: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
});
