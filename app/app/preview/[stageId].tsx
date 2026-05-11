import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CreatureSprite } from '../../src/components/common/CreatureSprite';
import { getBoss } from '../../src/data/bosses';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import { STAGES_BY_ID } from '../../src/data/stages';
import { statsAtLevel } from '../../src/engine/stats';
import { typeMultiplier, TYPE_COLORS } from '../../src/engine/types';
import { buildTeamSlots, usePlayerStore } from '../../src/stores/playerStore';
import { COLORS } from '../../src/theme';
import { CreatureType, Position } from '../../src/types';

interface PreviewUnit {
  creatureId: string;
  type: CreatureType;
  name: string;
  level: number;
  hp: number;
  position: Position;
  slot: number;
  side: 'player' | 'enemy';
}

export default function PreviewScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const stage = STAGES_BY_ID[stageId ?? ''];
  const team = usePlayerStore((s) => s.team);
  const owned = usePlayerStore((s) => s.ownedCreatures);

  const playerUnits = useMemo<PreviewUnit[]>(() => {
    return buildTeamSlots().map((slot) => {
      const def = CREATURES_BY_ID[slot.owned.creatureId];
      const stats = statsAtLevel(def, slot.owned.level);
      return {
        creatureId: def.id,
        type: def.type,
        name: def.name,
        level: slot.owned.level,
        hp: stats.hp,
        position: slot.position,
        slot: slot.slot,
        side: 'player',
      };
    });
  }, [team, owned]);

  const enemyUnits = useMemo<PreviewUnit[]>(() => {
    if (!stage) return [];
    return stage.enemies.map((cid, i) => {
      const def = CREATURES_BY_ID[cid];
      const stats = statsAtLevel(def, stage.enemyLevel);
      const position: Position = i < 3 ? 'front' : 'back';
      return {
        creatureId: def.id,
        type: def.type,
        name: def.name,
        level: stage.enemyLevel,
        hp: stats.hp,
        position,
        slot: i + 1,
        side: 'enemy',
      };
    });
  }, [stage]);

  // Team-vs-team summary: count of advantageous matchups for each side.
  const matchup = useMemo(() => {
    let playerStrong = 0;
    let playerWeak = 0;
    for (const p of playerUnits) {
      for (const e of enemyUnits) {
        const eff = typeMultiplier(p.type, e.type).effectiveness;
        if (eff === 'super') playerStrong++;
        if (eff === 'weak') playerWeak++;
      }
    }
    return { playerStrong, playerWeak };
  }, [playerUnits, enemyUnits]);

  if (!stage) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Stage not found.</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (playerUnits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You need at least one creature in your team!</Text>
        <Pressable
          style={styles.button}
          onPress={() => router.replace('/creatures')}
        >
          <Text style={styles.buttonText}>Manage Team</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.stageName} numberOfLines={1}>
            {stage.name}
          </Text>
          <Text style={styles.stageMeta}>
            Stage {stage.chapter}-{stage.index} · Lv {stage.enemyLevel}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {(() => {
          const boss = getBoss(stage.id);
          if (!boss) return null;
          const portraitId = stage.enemies[boss.portraitSlot ?? 0];
          const portraitDef = portraitId ? CREATURES_BY_ID[portraitId] : null;
          return (
            <View style={styles.bossBlock}>
              {portraitDef && (
                <CreatureSprite
                  creatureId={portraitDef.id}
                  type={portraitDef.type}
                  size={60}
                  flip
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.bossName}>
                  {boss.name.toUpperCase()} — BOSS
                </Text>
                <Text style={styles.bossTaunt}>{boss.taunt}</Text>
              </View>
            </View>
          );
        })()}

        <Text style={styles.sectionLabel}>ENEMY</Text>
        <TeamPanel units={enemyUnits} opposing={playerUnits} flip />

        <View style={styles.matchupBar}>
          <View style={styles.matchupHalf}>
            <Text style={[styles.matchupLabel, { color: COLORS.good }]}>
              ▲ {matchup.playerStrong}
            </Text>
            <Text style={styles.matchupHelp}>your advantages</Text>
          </View>
          <View style={[styles.matchupHalf, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
            <Text style={[styles.matchupLabel, { color: COLORS.danger }]}>
              ▼ {matchup.playerWeak}
            </Text>
            <Text style={styles.matchupHelp}>their advantages</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>YOUR TEAM</Text>
        <TeamPanel units={playerUnits} opposing={enemyUnits} />

        <View style={styles.rewardRow}>
          <Text style={styles.rewardText}>
            Victory: 💰 {stage.goldReward}  ✨ {stage.xpReward} XP
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace(`/battle/${stage.id}`)}
          style={({ pressed }) => [
            styles.fightButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.fightLabel}>FIGHT</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/creatures')}
          style={({ pressed }) => [
            styles.secondaryButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.secondaryLabel}>Adjust Team</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function TeamPanel({
  units,
  opposing,
  flip,
}: {
  units: PreviewUnit[];
  opposing: PreviewUnit[];
  flip?: boolean;
}) {
  const front = units
    .filter((u) => u.position === 'front')
    .sort((a, b) => a.slot - b.slot);
  const back = units
    .filter((u) => u.position === 'back')
    .sort((a, b) => a.slot - b.slot);

  // For each unit, determine its "best matchup" mark vs the opposing team.
  function markFor(u: PreviewUnit): 'super' | 'weak' | 'neutral' {
    let hasSuper = false;
    let allWeak = true;
    for (const o of opposing) {
      const eff = typeMultiplier(u.type, o.type).effectiveness;
      if (eff === 'super') hasSuper = true;
      if (eff !== 'weak') allWeak = false;
    }
    if (hasSuper) return 'super';
    if (allWeak && opposing.length > 0) return 'weak';
    return 'neutral';
  }

  return (
    <View style={styles.teamPanel}>
      <View style={[styles.teamRow, flip && { flexDirection: 'row' }]}>
        {(flip ? back : front).map((u) => (
          <PreviewCard key={`${u.creatureId}-${u.slot}`} unit={u} mark={markFor(u)} />
        ))}
      </View>
      <Text style={styles.teamRowLabel}>{flip ? 'BACK' : 'FRONT'}</Text>
      <View style={[styles.teamRow]}>
        {(flip ? front : back).map((u) => (
          <PreviewCard key={`${u.creatureId}-${u.slot}`} unit={u} mark={markFor(u)} />
        ))}
      </View>
      <Text style={styles.teamRowLabel}>{flip ? 'FRONT' : 'BACK'}</Text>
    </View>
  );
}

function PreviewCard({
  unit,
  mark,
}: {
  unit: PreviewUnit;
  mark: 'super' | 'weak' | 'neutral';
}) {
  const borderColor =
    mark === 'super' ? COLORS.good : mark === 'weak' ? COLORS.danger : COLORS.border;
  const markIcon = mark === 'super' ? '▲' : mark === 'weak' ? '▼' : '';
  const markColor = mark === 'super' ? COLORS.good : COLORS.danger;
  return (
    <View style={[styles.card, { borderColor }]}>
      <CreatureSprite
        creatureId={unit.creatureId}
        type={unit.type}
        size={56}
        flip={unit.side === 'enemy'}
      />
      <Text style={styles.cardName} numberOfLines={1}>
        {unit.name}
      </Text>
      <View style={styles.cardMeta}>
        <View style={[styles.typePill, { backgroundColor: TYPE_COLORS[unit.type] }]}>
          <Text style={styles.typePillText}>{unit.type.slice(0, 3).toUpperCase()}</Text>
        </View>
        <Text style={styles.cardLvl}>Lv {unit.level}</Text>
      </View>
      {markIcon !== '' && (
        <Text style={[styles.cardMark, { color: markColor }]}>{markIcon}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'stretch' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.bgElev,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  headerBtnText: { color: COLORS.text, fontWeight: '800' },
  stageName: { color: COLORS.text, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  stageMeta: { color: COLORS.textDim, fontSize: 11, textAlign: 'center' },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 100,
    paddingHorizontal: 24,
  },
  scroll: { padding: 12, paddingBottom: 40, gap: 10 },
  bossBlock: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  bossName: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  bossTaunt: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  sectionLabel: {
    color: COLORS.accent,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
    marginTop: 4,
  },
  teamPanel: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  teamRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  teamRowLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: 2,
  },
  card: {
    width: 80,
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: COLORS.bgElev,
    gap: 3,
  },
  cardName: { color: COLORS.text, fontSize: 11, fontWeight: '800', maxWidth: 70 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLvl: { color: COLORS.textDim, fontSize: 10, fontWeight: '700' },
  typePill: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  typePillText: { color: COLORS.bg, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardMark: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
  },
  matchupBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  matchupHalf: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  matchupLabel: { fontSize: 18, fontWeight: '900' },
  matchupHelp: { color: COLORS.textDim, fontSize: 10, marginTop: 2 },
  rewardRow: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  rewardText: { color: COLORS.textDim, fontSize: 13, fontWeight: '700' },
  fightButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  fightLabel: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 22,
    letterSpacing: 4,
  },
  secondaryButton: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  secondaryLabel: { color: COLORS.text, fontWeight: '700' },
  button: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: COLORS.bg, fontWeight: '900' },
});
