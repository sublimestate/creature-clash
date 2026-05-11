import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CreatureCard } from '../../src/components/creatures/CreatureCard';
import { FieldJournal } from '../../src/components/creatures/FieldJournal';
import { CurrencyHeader } from '../../src/components/common/CurrencyHeader';
import { CreatureSprite } from '../../src/components/common/CreatureSprite';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import { ABILITIES } from '../../src/data/abilities';
import {
  TeamSlotState,
  usePlayerStore,
} from '../../src/stores/playerStore';
import { COLORS, RARITY_COLORS } from '../../src/theme';
import { statsAtLevel } from '../../src/engine/stats';

export default function CreaturesScreen() {
  const owned = usePlayerStore((s) => s.ownedCreatures);
  const team = usePlayerStore((s) => s.team);
  const assignToSlot = usePlayerStore((s) => s.assignToSlot);

  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  const teamSet = useMemo(
    () => new Set(team.map((t) => t.instanceId).filter(Boolean) as string[]),
    [team],
  );

  const detail = useMemo(() => {
    const id = selectedInstanceId ?? team.find((t) => t.instanceId)?.instanceId ?? null;
    if (!id) return null;
    const o = owned.find((c) => c.instanceId === id);
    if (!o) return null;
    return o;
  }, [selectedInstanceId, owned, team]);

  function handleSlotPress(slot: number) {
    setActiveSlot((prev) => (prev === slot ? null : slot));
  }

  function handleCardPress(instanceId: string) {
    if (activeSlot !== null) {
      assignToSlot(activeSlot, instanceId);
      setActiveSlot(null);
    } else {
      setSelectedInstanceId(instanceId);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pack & Pets</Text>
        <CurrencyHeader />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Formation grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FORMATION</Text>
          <Text style={styles.helpText}>
            {activeSlot !== null
              ? `Tap a creature below to fill slot ${activeSlot}. Tap empty slot to clear.`
              : 'Tap a slot to assign a creature.'}
          </Text>
          <FormationGrid
            team={team}
            activeSlot={activeSlot}
            onSlotPress={handleSlotPress}
            onClearSlot={(slot) => assignToSlot(slot, null)}
          />
        </View>

        {/* Detail panel */}
        {detail && <DetailPanel instanceId={detail.instanceId} />}

        {/* Collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR PETS ({owned.length})</Text>
          <View style={styles.grid}>
            {owned.map((o) => (
              <View key={o.instanceId} style={styles.gridItem}>
                <CreatureCard
                  owned={o}
                  inTeam={teamSet.has(o.instanceId)}
                  selected={selectedInstanceId === o.instanceId}
                  onPress={() => handleCardPress(o.instanceId)}
                />
              </View>
            ))}
          </View>
        </View>

        <FieldJournal />
      </ScrollView>
    </View>
  );
}

function FormationGrid({
  team,
  activeSlot,
  onSlotPress,
  onClearSlot,
}: {
  team: TeamSlotState[];
  activeSlot: number | null;
  onSlotPress: (slot: number) => void;
  onClearSlot: (slot: number) => void;
}) {
  const front = team.filter((t) => t.position === 'front').sort((a, b) => a.slot - b.slot);
  const back = team.filter((t) => t.position === 'back').sort((a, b) => a.slot - b.slot);

  return (
    <View style={styles.formation}>
      <View style={styles.row}>
        {back.map((t) => (
          <Slot
            key={t.slot}
            slot={t}
            active={activeSlot === t.slot}
            onPress={() => onSlotPress(t.slot)}
            onLongPress={() => onClearSlot(t.slot)}
          />
        ))}
        <View style={styles.spacer} />
      </View>
      <Text style={styles.rowLabel}>BACK</Text>
      <View style={styles.row}>
        {front.map((t) => (
          <Slot
            key={t.slot}
            slot={t}
            active={activeSlot === t.slot}
            onPress={() => onSlotPress(t.slot)}
            onLongPress={() => onClearSlot(t.slot)}
          />
        ))}
      </View>
      <Text style={styles.rowLabel}>FRONT</Text>
    </View>
  );
}

function Slot({
  slot,
  active,
  onPress,
  onLongPress,
}: {
  slot: TeamSlotState;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const owned = usePlayerStore((s) =>
    s.ownedCreatures.find((c) => c.instanceId === slot.instanceId),
  );
  const def = owned ? CREATURES_BY_ID[owned.creatureId] : null;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.slot,
        active && styles.slotActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      {def ? (
        <>
          <CreatureSprite creatureId={def.id} type={def.type} size={48} />
          <Text style={styles.slotName} numberOfLines={1}>
            {owned!.nickname?.trim() || def.name}
          </Text>
          <Text style={styles.slotLvl}>Lv {owned!.level}</Text>
        </>
      ) : (
        <>
          <Text style={styles.slotEmpty}>+</Text>
          <Text style={styles.slotEmptyLabel}>Slot {slot.slot}</Text>
        </>
      )}
    </Pressable>
  );
}

function DetailPanel({ instanceId }: { instanceId: string }) {
  const owned = usePlayerStore((s) => s.ownedCreatures.find((c) => c.instanceId === instanceId));
  const setNickname = usePlayerStore((s) => s.setNickname);
  if (!owned) return null;
  const def = CREATURES_BY_ID[owned.creatureId];
  if (!def) return null;
  const stats = statsAtLevel(def, owned.level);
  const rarityColor = RARITY_COLORS[def.rarity];
  const headerName = owned.nickname?.trim() || def.name;
  return (
    <View style={[styles.section, { borderColor: rarityColor, borderWidth: 1 }]}>
      <Text style={styles.sectionTitle}>{headerName.toUpperCase()}</Text>
      <View style={styles.detailRow}>
        <CreatureSprite creatureId={def.id} type={def.type} size={80} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.detailType, { color: rarityColor }]}>
            {def.rarity.toUpperCase()} · {def.type.toUpperCase()} · {def.name.toUpperCase()}
          </Text>
          <Text style={styles.detailLvl}>Level {owned.level}</Text>
          <Text style={styles.detailFlavor}>{def.flavor}</Text>
        </View>
      </View>

      <View style={styles.nicknameField}>
        <Text style={styles.nicknameLabel}>NICKNAME</Text>
        <TextInput
          value={owned.nickname ?? ''}
          onChangeText={(t) => setNickname(owned.instanceId, t)}
          placeholder={`Call them what you like — or leave blank for "${def.name}"`}
          placeholderTextColor={COLORS.textDim}
          maxLength={16}
          style={styles.nicknameInput}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatBlock label="HP" value={stats.hp} />
        <StatBlock label="ATK" value={stats.atk} />
        <StatBlock label="DEF" value={stats.def} />
        <StatBlock label="SP.A" value={stats.spAtk} />
        <StatBlock label="SP.D" value={stats.spDef} />
        <StatBlock label="SPD" value={stats.spd} />
      </View>
      <View style={{ marginTop: 8, gap: 6 }}>
        {def.abilities.map((aid) => {
          const a = ABILITIES[aid];
          if (!a) return null;
          return (
            <View key={aid} style={styles.ability}>
              <View style={{ flex: 1 }}>
                <Text style={styles.abilityName}>{a.name}</Text>
                <Text style={styles.abilityDesc}>{a.description}</Text>
              </View>
              <View style={styles.abilityMeta}>
                <Text style={styles.abilityPower}>
                  {a.power > 0 ? `${a.power}` : '—'}
                </Text>
                <Text style={styles.abilityCd}>CD {a.cooldown}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgElev,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  scroll: { padding: 12, paddingBottom: 80, gap: 14 },
  section: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.accent,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  helpText: { color: COLORS.textDim, fontSize: 11 },
  formation: { gap: 4, marginTop: 6 },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  rowLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 4,
  },
  spacer: { width: 70 },
  slot: {
    width: 70,
    height: 88,
    backgroundColor: COLORS.bgElev,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  slotActive: {
    borderColor: COLORS.accent,
    borderStyle: 'solid',
    backgroundColor: COLORS.panelLight,
  },
  slotEmpty: { color: COLORS.border, fontSize: 24, fontWeight: '900' },
  slotEmptyLabel: { color: COLORS.textDim, fontSize: 9, marginTop: 2 },
  slotName: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 60,
  },
  slotLvl: { color: COLORS.textDim, fontSize: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  gridItem: { width: '48.5%' },
  detailRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  detailType: { fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  detailLvl: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  detailFlavor: { color: COLORS.textDim, fontSize: 12, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  statBlock: {
    flexBasis: '32%',
    backgroundColor: COLORS.bgElev,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  statLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '800' },
  statValue: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  ability: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgElev,
    padding: 8,
    borderRadius: 6,
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
  },
  abilityName: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
  abilityDesc: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  abilityMeta: { alignItems: 'flex-end' },
  abilityPower: { color: COLORS.accent, fontWeight: '900', fontSize: 14 },
  abilityCd: { color: COLORS.textDim, fontSize: 10 },
  nicknameField: { marginTop: 8, gap: 4 },
  nicknameLabel: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  nicknameInput: {
    backgroundColor: COLORS.bgElev,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    padding: 8,
    borderRadius: 6,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
});
