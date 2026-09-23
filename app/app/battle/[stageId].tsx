import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { playBgm, playSfx, SfxName, stopBgm } from '../../src/audio';
import {
  BattleUnit,
  UnitDisplayState,
} from '../../src/components/battle/BattleUnit';
import { MuteButton } from '../../src/components/common/MuteButton';
import { getBoss } from '../../src/data/bosses';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import { STAGES, STAGES_BY_ID } from '../../src/data/stages';
import { simulateBattle, buildEnemyTeam, makeBattleCreature, TeamSlot } from '../../src/engine/battle';
import { rollRecruitment } from '../../src/engine/recruitment';
import { Rng } from '../../src/engine/rng';
import { statsAtLevel } from '../../src/engine/stats';
import { usePlayerStore, buildTeamSlots } from '../../src/stores/playerStore';
import { OwnedCreature } from '../../src/types';
import { COLORS } from '../../src/theme';
import { BattleEvent } from '../../src/types';

const ABILITY_ICONS: Record<string, string> = {
  scratch: '///',
  bite: '🦷',
  nip: '🦷',
  tackle: '💥',
  swat: '🐾',
  bark: '🔊',
  pounce: '🐾',
  maul: '💥',
  fang_strike: '🦷',
  dash: '💨',
  zoomies: '💨',
  pursue: '💨',
  brace: '🛡️',
  body_slam: '💥',
  endure: '🛡️',
  trick: '✨',
  feint: '✨',
  outsmart: '💡',
  pack_howl: '🔊',
  rally: '❤️',
  group_pounce: '🐾',
  frenzy: '💢',
  snarl: '🔊',
  feral_lunge: '💥',
};

const SPEEDS: Array<{ label: string; ms: number }> = [
  { label: '1×', ms: 800 },
  { label: '2×', ms: 400 },
  { label: '3×', ms: 200 },
  { label: '4×', ms: 100 },
];

export default function BattleScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const stage = STAGES_BY_ID[stageId ?? ''];

  const addGold = usePlayerStore((s) => s.addGold);
  const awardXp = usePlayerStore((s) => s.awardXp);
  const recordStage = usePlayerStore((s) => s.recordStage);
  const markCreaturesMet = usePlayerStore((s) => s.markCreaturesMet);
  const addCreature = usePlayerStore((s) => s.addCreature);
  const markOutroSeen = usePlayerStore((s) => s.markOutroSeen);
  const hasSeenOutro = usePlayerStore((s) => s.hasSeenOutro);

  // Post-battle results to surface in the victory banner.
  const [levelUps, setLevelUps] = useState<OwnedCreature[]>([]);
  const [recruit, setRecruit] = useState<OwnedCreature | null>(null);

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
  // Default to 2× — 1× felt too sluggish for an auto-battler in playtest.
  const [speedIndex, setSpeedIndex] = useState(1);
  const [rewarded, setRewarded] = useState(false);

  const tickRef = useRef(0);
  const speed = SPEEDS[speedIndex];

  useEffect(() => {
    setUnits(initialUnits);
  }, [initialUnits]);

  // Battle music for the duration of the screen; back to the theme on exit.
  useEffect(() => {
    playBgm('battle');
    return () => playBgm('theme');
  }, []);

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

    const sfx = sfxForEvent(event);
    if (sfx) playSfx(sfx);

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
                if (event.abilityId) {
                  next.hitEffect = { icon: ABILITY_ICONS[event.abilityId] || '💥', tick };
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
    stopBgm();
    playSfx(battleData.result.winner === 'player' ? 'victory' : 'defeat');
    if (battleData.result.winner === 'player') {
      addGold(stage.goldReward);
      const playerInstanceIds = battleData.playerSlots.map((s) => s.owned.instanceId);
      const leveled = awardXp(playerInstanceIds, stage.xpReward);
      setLevelUps(leveled);
      // Stagger the reward stings so they read after the victory jingle.
      if (leveled.length > 0) setTimeout(() => playSfx('levelup'), 700);

      const survivors = battleData.result.playerSurvivors;
      const stars = survivors >= 4 ? 3 : survivors >= 2 ? 2 : 1;
      recordStage(stage.id, stars);
      markCreaturesMet(stage.enemies, stage.id);

      // Roll for a recruit. Uses a fresh Rng so retrying a stage produces a
      // different recruit outcome (deterministic per attempt, not per stage).
      const ownedSpeciesIds = new Set(
        usePlayerStore.getState().ownedCreatures.map((c) => c.creatureId),
      );
      const recruitRoll = rollRecruitment({
        enemyCreatureIds: stage.enemies,
        stars,
        ownedSpeciesIds,
        rng: new Rng(Date.now() & 0xffffffff),
      });
      if (recruitRoll) {
        // Recruit joins at half the stage's enemy level (minimum 1) so they're
        // useful soon but not free power.
        const recruitLevel = Math.max(1, Math.floor(stage.enemyLevel / 2));
        const added = addCreature(recruitRoll.creatureId, recruitLevel);
        setRecruit(added);
        setTimeout(() => playSfx('recruit'), 1100);
      }
    }
  }, [
    done,
    battleData,
    stage,
    rewarded,
    addGold,
    awardXp,
    recordStage,
    markCreaturesMet,
    addCreature,
  ]);

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
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <MuteButton />
          <Pressable
            onPress={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>{speed.label}</Text>
          </Pressable>
        </View>
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

          {winner === 'player' && levelUps.length > 0 && (
            <View style={styles.beatBlock}>
              <Text style={styles.beatHeader}>LEVELED UP</Text>
              {levelUps.map((c) => {
                const def = CREATURES_BY_ID[c.creatureId];
                const display = c.nickname?.trim() || def?.name || c.creatureId;
                const prevStats = def ? statsAtLevel(def, Math.max(1, c.level - 1)) : null;
                const newStats = def ? statsAtLevel(def, c.level) : null;
                return (
                  <View key={c.instanceId} style={styles.beatRow}>
                    <Text style={styles.beatName}>{display}</Text>
                    <Text style={styles.beatDetail}>
                      reached Lv {c.level}
                      {prevStats && newStats && (
                        <Text style={styles.beatDelta}>
                          {'  '}+{newStats.hp - prevStats.hp} HP, +
                          {newStats.atk - prevStats.atk} ATK
                        </Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {winner === 'player' && recruit && (
            <View style={[styles.beatBlock, styles.beatRecruit]}>
              <Text style={[styles.beatHeader, { color: COLORS.good }]}>
                NEW PET JOINED
              </Text>
              <Text style={styles.recruitName}>
                {CREATURES_BY_ID[recruit.creatureId]?.name ?? recruit.creatureId}{' '}
                <Text style={styles.beatDetail}>(Lv {recruit.level})</Text>
              </Text>
              <Text style={styles.beatDetail}>
                {CREATURES_BY_ID[recruit.creatureId]?.flavor ?? ''}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={() => {
                playSfx('tap');
                // After beating the final stage for the first time, route
                // to the outro instead of back to the campaign list.
                const finalId = STAGES[STAGES.length - 1].id;
                if (
                  winner === 'player' &&
                  stage.id === finalId &&
                  !hasSeenOutro
                ) {
                  markOutroSeen();
                  router.replace('/outro');
                  return;
                }
                router.replace('/battle');
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                playSfx('tap');
                router.replace(`/preview/${stage.id}`);
              }}
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

function sfxForEvent(event: BattleEvent): SfxName | null {
  switch (event.kind) {
    case 'attack':
      if (event.dodged) return 'miss';
      if (event.isCrit) return 'crit';
      if (event.effectiveness === 'super') return 'super';
      if (event.effectiveness === 'weak') return 'weak';
      return 'hit';
    case 'heal':
      return 'heal';
    case 'buff':
      return 'buff';
    case 'status_apply':
      return 'status';
    case 'faint':
      return 'faint';
    default:
      return null;
  }
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    minWidth: 68,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // react-native-web pass-throughs — prevent the inner Text from being
    // selected on tap (which steals the click) and show a pointer.
    userSelect: 'none',
    cursor: 'pointer',
  },
  headerBtnText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    userSelect: 'none',
  },
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
  beatBlock: {
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    minWidth: 260,
    maxWidth: 360,
    gap: 4,
  },
  beatRecruit: {
    backgroundColor: 'rgba(67,227,124,0.10)',
    borderColor: COLORS.good,
    borderWidth: 1,
  },
  beatHeader: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  beatRow: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  beatName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  beatDetail: { color: COLORS.textDim, fontSize: 12 },
  beatDelta: { color: COLORS.good, fontSize: 11, fontWeight: '700' },
  recruitName: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: COLORS.bg, fontWeight: '900', fontSize: 14 },
  bigText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
});
