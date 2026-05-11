import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CREATURES } from '../../data/creatures';
import { STAGES_BY_ID } from '../../data/stages';
import { TYPE_COLORS } from '../../engine/types';
import { usePlayerStore } from '../../stores/playerStore';
import { COLORS, RARITY_COLORS } from '../../theme';
import { CreatureSprite } from '../common/CreatureSprite';

type Status = 'owned' | 'met' | 'unmet';

type Filter = 'all' | 'owned' | 'met' | 'unmet';

// A small encyclopedia: every creature in the game listed once. Owned and met
// entries are full-color; unmet entries show the silhouette + "???".
export function FieldJournal() {
  const owned = usePlayerStore((s) => s.ownedCreatures);
  const met = usePlayerStore((s) => s.metCreatures);
  const [filter, setFilter] = useState<Filter>('all');

  const ownedSpecies = useMemo(() => {
    const set = new Set<string>();
    for (const c of owned) set.add(c.creatureId);
    return set;
  }, [owned]);

  const entries = CREATURES.map((def) => {
    let status: Status;
    if (ownedSpecies.has(def.id)) status = 'owned';
    else if (met[def.id]) status = 'met';
    else status = 'unmet';
    return { def, status };
  });

  const stats = {
    owned: entries.filter((e) => e.status === 'owned').length,
    met: entries.filter((e) => e.status === 'met').length,
    total: entries.length,
  };

  const visible = entries.filter((e) => filter === 'all' || e.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>FIELD JOURNAL</Text>
        <Text style={styles.progress}>
          {stats.owned + stats.met} / {stats.total}
        </Text>
      </View>
      <Text style={styles.help}>
        A record of every pet you've crossed paths with.
      </Text>

      <View style={styles.filterRow}>
        <FilterChip
          label={`All ${stats.total}`}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterChip
          label={`Owned ${stats.owned}`}
          active={filter === 'owned'}
          onPress={() => setFilter('owned')}
        />
        <FilterChip
          label={`Met ${stats.met}`}
          active={filter === 'met'}
          onPress={() => setFilter('met')}
        />
        <FilterChip
          label={`Unmet ${stats.total - stats.owned - stats.met}`}
          active={filter === 'unmet'}
          onPress={() => setFilter('unmet')}
        />
      </View>

      <View style={styles.list}>
        {visible.length === 0 && (
          <Text style={styles.empty}>Nothing here yet.</Text>
        )}
        {visible.map(({ def, status }) => (
          <Entry
            key={def.id}
            creatureId={def.id}
            speciesName={def.name}
            type={def.type}
            rarity={def.rarity}
            flavor={def.flavor}
            status={status}
            firstSeenStageId={met[def.id]?.firstSeenStageId}
          />
        ))}
      </View>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface EntryProps {
  creatureId: string;
  speciesName: string;
  type: string;
  rarity: string;
  flavor: string;
  status: Status;
  firstSeenStageId?: string;
}

function Entry({
  creatureId,
  speciesName,
  type,
  rarity,
  flavor,
  status,
  firstSeenStageId,
}: EntryProps) {
  const isUnmet = status === 'unmet';
  const stageName = firstSeenStageId
    ? STAGES_BY_ID[firstSeenStageId]?.name
    : null;

  return (
    <View
      style={[
        styles.entry,
        { borderColor: isUnmet ? COLORS.border : RARITY_COLORS[rarity] },
      ]}
    >
      {/* Sprite — silhouette via near-zero opacity over a neutral fill for unmet */}
      <View style={styles.spriteWrap}>
        {isUnmet ? (
          <View style={styles.silhouetteOverlay}>
            <View style={styles.silhouetteDim} />
            <Text style={styles.silhouetteMark}>?</Text>
          </View>
        ) : (
          <CreatureSprite
            creatureId={creatureId}
            type={type as any}
            size={56}
          />
        )}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryName}>
            {isUnmet ? '???' : speciesName}
          </Text>
          {!isUnmet && (
            <View
              style={[
                styles.typePill,
                { backgroundColor: TYPE_COLORS[type as keyof typeof TYPE_COLORS] },
              ]}
            >
              <Text style={styles.typePillText}>
                {type.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {status === 'owned' && (
          <Text style={styles.statusOwned}>In your pack</Text>
        )}
        {status === 'met' && stageName && (
          <Text style={styles.statusMet}>First seen at {stageName}</Text>
        )}
        {status === 'met' && !stageName && (
          <Text style={styles.statusMet}>Encountered in battle</Text>
        )}
        {status === 'unmet' && (
          <Text style={styles.statusUnmet}>
            Not yet seen. The block is bigger than it looks.
          </Text>
        )}

        {!isUnmet && <Text style={styles.flavor}>{flavor}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    color: COLORS.accent,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  progress: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
  },
  help: { color: COLORS.textDim, fontSize: 11, fontStyle: 'italic' },
  filterRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.bgElev,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: { color: COLORS.textDim, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: COLORS.bg, fontWeight: '900' },
  empty: {
    color: COLORS.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  list: { gap: 6, marginTop: 4 },
  entry: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.bgElev,
    borderWidth: 1,
    alignItems: 'center',
  },
  spriteWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteOverlay: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
    opacity: 0.4,
  },
  silhouetteMark: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 22,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  typePillText: {
    color: COLORS.bg,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusOwned: { color: COLORS.good, fontSize: 11, fontWeight: '700' },
  statusMet: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  statusUnmet: { color: COLORS.textDim, fontSize: 11, fontStyle: 'italic' },
  flavor: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
});
