import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BattleUnit,
  UnitDisplayState,
} from '../../src/components/battle/BattleUnit';
import { getBoss } from '../../src/data/bosses';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import { STAGES_BY_ID } from '../../src/data/stages';
import { simulateBattle, buildEnemyTeam, makeBattleCreature, TeamSlot } from '../../src/engine/battle';
import { usePlayerStore, buildTeamSlots } from '../../src/stores/playerStore';
import { COLORS } from '../../src/theme';
import { BattleEvent } from '../../src/types';

const SPEEDS: Array<{ label: string; ms: number }> = [
  { label: '1×', ms: 800 },
  { label: '2×', ms: 400 },
  { label: '3×', ms: 200 },
];

export default function BattleScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const stage = STAGES_BY_ID[stageId ?? ''];

  const addGold = usePlayerStore((s) => s.addGold);
  const awardXp = usePlayerStore((s) => s.awardXp);
  const recordStage = usePlayerStore((s) => s.recordStage);
  const markCreaturesMet = usePlayerStore((s) => s.markCreaturesMet);

  // Snapshot the team & build TeamSlots once when entering the screen.
  const battleData = useMemo(() => {
    if (!stage) return null;
    const playerSlots = buildTeamSlots();
    if (playerSlots.length === 0) return null;
    const enemySlots = buildEnemyTeam(stage);
    const seed = Date.now() & 0xffffffff;
    const result = simulateBattle(playerSlots, enemySlots, seed);
    return { playerSlots, enemySlots, result };
  }, [stage]);

  // Initial unit display states (HP at full, all alive)
  const initialUnits = useMemo<UnitDisplayState[]>(() => {
    if (!battleData) return [];
    const make = (slot: TeamSlot, side: 'player' | 'enemy'): UnitDisplayState => {
      const c = makeBattleCreature(slot.owned, side, slot.position, slot.slot);
      return {
        instanceId: c.instanceId,
        creatureId: c.creatureId,
        name: c.name,
        level: c.level,
        hp: c.hp,
        maxHp: c.maxHp,
        isAlive: true,
        side,
        position: c.position,
        slot: c.slot,
        statuses: [],
        specialCooldown: 0,
      };
    };
    return [
      ...battleData.playerSlots.map((s) => make(s, 'player')),
      ...battleData.enemySlots.map((s) => make(s, 'enemy')),
    ];
  }, [battleData]);

  const [units, setUnits] = useState<UnitDisplayState[]>(initialUnits);
  const [eventIndex, setEventIndex] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [rewarded, setRewarded] = useState(false);

  const tickRef = useRef(0);
  const speed = SPEEDS[speedIndex];

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  // Drive playback
  useEffect(() => {
    if (!battleData) return;
    if (done || paused) return;
    if (eventIndex >= battleData.result.events.length) return;

    const event = battleData.result.events[eventIndex];
    const timer = setTimeout(() => {
      applyEvent(event);
      setLog((prev) => [...prev.slice(-20), event.message]);
      setEventIndex((i) => i + 1);
      if (eventIndex === battleData.result.events.length - 1) {
        setDone(true);
      }
    }, speed.ms);

    return () => clearTimeout(timer);
  }, [battleData, eventIndex, done, paused, speed]);

  function applyEvent(event: BattleEvent) {
    tickRef.current += 1;
    const tick = tickRef.current;

    setUnits((prev) =>
      prev.map((u) => {
        const next = { ...u };

        if (event.hpAfter && event.hpAfter[u.instanceId] !== undefined) {
          const newHp = event.hpAfter[u.instanceId];
          if (newHp !== u.hp) {
            next.hp = newHp;
            if (newHp === 0) next.isAlive = false;
          }
        }
        // Sync statuses
        if (event.statusesAfter && event.statusesAfter[u.instanceId]) {
          next.statuses = event.statusesAfter[u.instanceId];
        }
        // Sync special-move cooldown (second ability)
        const def = CREATURES_BY_ID[u.creatureId];
        const specialId = def?.abilities[1];
        if (specialId && event.cooldownsAfter?.[u.instanceId]) {
          next.specialCooldown = event.cooldownsAfter[u.instanceId][specialId] ?? 0;
        }

        // Attack lunge for the attacker, hit shake + popup for target(s)
        if (event.kind === 'attack' || event.kind === 'heal') {
          if (event.attacker === u.instanceId && event.kind === 'attack') {
            next.attackTick = tick;
          }
          const isTarget =
            event.target === u.instanceId ||
            event.targets?.includes(u.instanceId);
          if (isTarget) {
            if (event.kind === 'attack') {
              if (event.dodged) {
                next.popup = { value: 0, kind: 'miss', tick };
                // No hit shake or flash on a dodge.
              } else {
                next.hitTick = tick;
                next.popup = {
                  value: event.damage ?? 0,
                  kind: 'damage',
                  eff: event.effectiveness,
                  isCrit: event.isCrit,
                  tick,
                };
                if (event.abilityType) {
                  next.flash = { type: event.abilityType, tick };
                }
              }
            } else if (event.kind === 'heal') {
              next.popup = {
                value: event.damage ?? 0,
                kind: 'heal',
                tick,
              };
              if (event.abilityType) {
                next.flash = { type: event.abilityType, tick };
              }
            }
          }
        }

        // Mark active actor for turn highlight
        next.active = event.attacker === u.instanceId && u.isAlive;
        return next;
      }),
    );
  }

  // Award rewards once
  useEffect(() => {
    if (!done || !battleData || rewarded) return;
    if (!stage) return;
    setRewarded(true);
    if (battleData.result.winner === 'player') {
      addGold(stage.goldReward);
      const playerInstanceIds = battleData.playerSlots.map((s) => s.owned.instanceId);
      awardXp(playerInstanceIds, stage.xpReward);
      const survivors = battleData.result.playerSurvivors;
      const stars = survivors >= 4 ? 3 : survivors >= 2 ? 2 : 1;
      recordStage(stage.id, stars);
      // Mark every enemy species as encountered for the field journal.
      markCreaturesMet(stage.enemies, stage.id);
    }
  }, [done, battleData, stage, rewarded, addGold, awardXp, recordStage, markCreaturesMet]);

  if (!stage) {
    return (
      <View style={styles.container}>
        <Text style={styles.bigText}>Stage not found.</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }
  if (!battleData) {
    return (
      <View style={styles.container}>
        <Text style={styles.bigText}>You need at least one creature in your team!</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/creatures')}>
          <Text style={styles.buttonText}>Manage Team</Text>
        </Pressable>
      </View>
    );
  }

  const playerUnits = units.filter((u) => u.side === 'player');
  const enemyUnits = units.filter((u) => u.side === 'enemy');

  const winner =
    done ? battleData.result.winner : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>‹ Flee</Text>
        </Pressable>
        <View>
          <Text style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.stageMeta}>
            Stage {stage.chapter}-{stage.index}
          </Text>
        </View>
        <Pressable
          onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnText}>{speed.label}</Text>
        </Pressable>
      </View>

      <View style={styles.arena}>
        <Side units={enemyUnits} side="enemy" />
        <View style={styles.divider} />
        <Side units={playerUnits} side="player" />
      </View>

      <ScrollView
        style={styles.log}
        contentContainerStyle={styles.logContent}
        ref={(r) => r?.scrollToEnd({ animated: true })}
      >
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>

      {winner && (
        <View style={[styles.endBanner, winner === 'player' ? styles.win : styles.lose]}>
          <Text style={styles.endTitle}>
            {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
          </Text>
          {winner === 'player' && (
            <Text style={styles.endSub}>
              +{stage.goldReward} gold, +{stage.xpReward} XP
            </Text>
          )}
          {winner === 'player' && getBoss(stage.id)?.victoryLine && (
            <Text style={styles.bossLine}>
              {getBoss(stage.id)!.victoryLine}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={() => router.replace('/battle')}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace(`/preview/${stage.id}`)}
              style={[styles.button, { backgroundColor: COLORS.panel }]}
            >
              <Text style={[styles.buttonText, { color: COLORS.text }]}>Retry</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Side({ units, side }: { units: UnitDisplayState[]; side: 'player' | 'enemy' }) {
  const front = units
    .filter((u) => u.position === 'front')
    .sort((a, b) => a.slot - b.slot);
  const back = units
    .filter((u) => u.position === 'back')
    .sort((a, b) => a.slot - b.slot);
  return (
    <View style={styles.side}>
      {side === 'enemy' ? (
        <>
          <Row units={back} />
          <Row units={front} />
        </>
      ) : (
        <>
          <Row units={front} />
          <Row units={back} />
        </>
      )}
    </View>
  );
}

function Row({ units }: { units: UnitDisplayState[] }) {
  return (
    <View style={styles.row}>
      {units.map((u) => (
        <BattleUnit key={u.instanceId} unit={u} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.bgElev,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
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
  stageName: { color: COLORS.text, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  stageMeta: { color: COLORS.textDim, fontSize: 11, textAlign: 'center' },
  arena: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
    opacity: 0.5,
  },
  side: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  log: {
    height: 110,
    backgroundColor: COLORS.bgElev,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  logContent: { padding: 8, gap: 2 },
  logLine: { color: COLORS.textDim, fontSize: 11 },
  endBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  win: {},
  lose: {},
  endTitle: { color: COLORS.accent, fontSize: 36, fontWeight: '900', letterSpacing: 4 },
  endSub: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  bossLine: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
    maxWidth: 400,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: COLORS.bg, fontWeight: '900', fontSize: 14 },
  bigText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
