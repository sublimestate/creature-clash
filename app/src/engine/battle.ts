import { ABILITIES } from '../data/abilities';
import { CREATURES_BY_ID } from '../data/creatures';
import {
  Ability,
  BattleCreature,
  BattleEvent,
  BattleResult,
  OwnedCreature,
  Position,
  StageDefinition,
} from '../types';
import { selectAction } from './ai';
import { tickBuffs, effectiveStat } from './buffs';
import { computeDamage } from './damage';
import { Rng } from './rng';
import { statsAtLevel } from './stats';

const MAX_TURNS = 200;

export interface TeamSlot {
  owned: OwnedCreature;
  position: Position;
  slot: number;
}

export function makeBattleCreature(
  owned: OwnedCreature,
  side: 'player' | 'enemy',
  position: Position,
  slot: number,
): BattleCreature {
  const def = CREATURES_BY_ID[owned.creatureId];
  if (!def) throw new Error(`Unknown creature: ${owned.creatureId}`);
  const stats = statsAtLevel(def, owned.level);
  const abilities = def.abilities.map((id) => {
    const a = ABILITIES[id];
    if (!a) throw new Error(`Unknown ability: ${id}`);
    return a;
  }) as [Ability, Ability];
  return {
    instanceId: owned.instanceId,
    creatureId: owned.creatureId,
    // Battle log + on-screen labels honor the nickname. Falls back to the
    // species name for enemies (which never have nicknames).
    name: owned.nickname?.trim() || def.name,
    type: def.type,
    level: owned.level,
    side,
    position,
    slot,
    stats,
    maxHp: stats.hp,
    hp: stats.hp,
    abilities,
    cooldowns: {},
    buffs: [],
    statuses: [],
    isAlive: true,
  };
}

function snapshot(units: BattleCreature[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const u of units) r[u.instanceId] = u.hp;
  return r;
}

function snapshotStatuses(
  units: BattleCreature[],
): Record<string, import('../types').StatusKind[]> {
  const r: Record<string, import('../types').StatusKind[]> = {};
  for (const u of units) r[u.instanceId] = u.statuses.map((s) => s.kind);
  return r;
}

function snapshotCooldowns(
  units: BattleCreature[],
): Record<string, Record<string, number>> {
  const r: Record<string, Record<string, number>> = {};
  for (const u of units) {
    const cd: Record<string, number> = {};
    for (const ab of u.abilities) cd[ab.id] = u.cooldowns[ab.id] ?? 0;
    r[u.instanceId] = cd;
  }
  return r;
}

function applyDamage(target: BattleCreature, dmg: number): boolean {
  target.hp = Math.max(0, target.hp - dmg);
  if (target.hp === 0) {
    target.isAlive = false;
    return true;
  }
  return false;
}

function applyHealing(target: BattleCreature, amount: number): void {
  target.hp = Math.min(target.maxHp, target.hp + amount);
}

function aliveTeam(units: BattleCreature[]): BattleCreature[] {
  return units.filter((u) => u.isAlive);
}

export function simulateBattle(
  playerSlots: TeamSlot[],
  enemySlots: TeamSlot[],
  seed: number,
): BattleResult {
  const rng = new Rng(seed);

  const player = playerSlots.map((s) =>
    makeBattleCreature(s.owned, 'player', s.position, s.slot),
  );
  const enemy = enemySlots.map((s) =>
    makeBattleCreature(s.owned, 'enemy', s.position, s.slot),
  );
  const all = [...player, ...enemy];

  const events: BattleEvent[] = [];
  let turn = 0;

  // Helper that attaches HP/status/cooldown snapshots to every event so the
  // playback UI can stay in sync without re-running the engine.
  const push = (ev: BattleEvent): void => {
    events.push({
      ...ev,
      hpAfter: ev.hpAfter ?? snapshot(all),
      statusesAfter: snapshotStatuses(all),
      cooldownsAfter: snapshotCooldowns(all),
    });
  };

  while (
    aliveTeam(player).length > 0 &&
    aliveTeam(enemy).length > 0 &&
    turn < MAX_TURNS
  ) {
    turn++;
    push({
      kind: 'turn_start',
      message: `— Turn ${turn} —`,
    });

    const order = [...all]
      .filter((c) => c.isAlive)
      .sort((a, b) => effectiveStat(b, 'spd') - effectiveStat(a, 'spd'));

    // Priority abilities act first regardless of speed
    const priorityActors: BattleCreature[] = [];
    const normalActors: BattleCreature[] = [];
    for (const actor of order) {
      const ready = actor.abilities.find(
        (a) => (actor.cooldowns[a.id] ?? 0) === 0 && a.priority,
      );
      if (ready) priorityActors.push(actor);
      else normalActors.push(actor);
    }
    const finalOrder = [...priorityActors, ...normalActors];

    for (const actor of finalOrder) {
      if (!actor.isAlive) continue;
      if (aliveTeam(player).length === 0 || aliveTeam(enemy).length === 0) break;

      // Skip turn if stunned (33% chance)
      const stun = actor.statuses.find((s) => s.kind === 'stun');
      if (stun && rng.chance(0.33)) {
        push({
          kind: 'status_tick',
          attacker: actor.instanceId,
          message: `${actor.name} is stunned and can't move!`,
        });
        continue;
      }

      const enemies = actor.side === 'player' ? enemy : player;
      const allies = actor.side === 'player' ? player : enemy;
      const choice = selectAction(actor, enemies, allies);
      if (!choice) continue;

      // Apply cooldown FIRST so the snapshot in event reflects it.
      if (choice.ability.cooldown > 0) {
        actor.cooldowns[choice.ability.id] = choice.ability.cooldown;
      }
      executeAbility(actor, choice.ability, choice.targets, all, push, rng);
    }

    // End-of-turn: tick statuses (DOT) and cooldowns/buffs
    for (const c of all) {
      if (!c.isAlive) continue;
      for (const status of c.statuses) {
        if (status.kind === 'bleed' || status.kind === 'daze') {
          const dot = Math.max(1, Math.round(c.maxHp * 0.06));
          const fainted = applyDamage(c, dot);
          push({
            kind: 'status_tick',
            attacker: c.instanceId,
            target: c.instanceId,
            damage: dot,
            message: `${c.name} takes ${dot} ${status.kind} damage.`,
          });
          if (fainted) {
            push({
              kind: 'faint',
              target: c.instanceId,
              message: `${c.name} fainted!`,
            });
          }
        }
      }
      // Tick all durations
      c.statuses = c.statuses
        .map((s) => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
        .filter((s) => s.turnsLeft > 0);
      tickBuffs(c);
      for (const id of Object.keys(c.cooldowns)) {
        if (c.cooldowns[id] > 0) c.cooldowns[id] -= 1;
      }
    }
  }

  const winner: 'player' | 'enemy' =
    aliveTeam(player).length > 0 ? 'player' : 'enemy';
  push({
    kind: 'battle_end',
    message: winner === 'player' ? 'Victory!' : 'Defeat...',
  });

  const finalState: Record<string, { hp: number; isAlive: boolean }> = {};
  for (const c of all) finalState[c.instanceId] = { hp: c.hp, isAlive: c.isAlive };

  return {
    winner,
    events,
    turnsTaken: turn,
    playerSurvivors: aliveTeam(player).length,
    finalState,
  };
}

function executeAbility(
  actor: BattleCreature,
  ability: Ability,
  targets: BattleCreature[],
  all: BattleCreature[],
  push: (e: BattleEvent) => void,
  rng: Rng,
): void {
  // Buff / heal abilities
  if (ability.category === 'buff' || ability.category === 'heal') {
    if (ability.selfBuff) {
      actor.buffs.push({
        stat: ability.selfBuff.stat,
        pct: ability.selfBuff.pct,
        turnsLeft: ability.selfBuff.turns + 1,
      });
    }
    if (ability.teamBuff) {
      const team = all.filter((c) => c.side === actor.side && c.isAlive);
      for (const t of team) {
        t.buffs.push({
          stat: ability.teamBuff.stat,
          pct: ability.teamBuff.pct,
          turnsLeft: ability.teamBuff.turns + 1,
        });
      }
    }
    if (ability.category === 'heal' && ability.power > 0) {
      const amount = Math.round(actor.maxHp * (ability.power / 100));
      applyHealing(actor, amount);
      push({
        kind: 'heal',
        attacker: actor.instanceId,
        target: actor.instanceId,
        abilityId: ability.id,
        abilityType: ability.type,
        damage: -amount,
        message: `${actor.name} uses ${ability.name} and recovers ${amount} HP.`,
      });
      return;
    }
    push({
      kind: 'buff',
      attacker: actor.instanceId,
      abilityId: ability.id,
      abilityType: ability.type,
      message: `${actor.name} uses ${ability.name}.`,
    });
    return;
  }

  // Damage abilities
  const damagedTargets = targets.filter((t) => t.isAlive);
  const aoeMultiplier = ability.aoe && damagedTargets.length > 1 ? 0.7 : 1;

  for (const target of damagedTargets) {
    const { damage, effectiveness } = computeDamage(actor, target, ability, rng);
    const finalDmg = Math.max(1, Math.round(damage * aoeMultiplier));
    const fainted = applyDamage(target, finalDmg);

    let msg = `${actor.name} uses ${ability.name} on ${target.name} for ${finalDmg} damage`;
    if (effectiveness === 'super') msg += ' — super effective!';
    else if (effectiveness === 'weak') msg += ' — not very effective.';
    else msg += '.';

    push({
      kind: 'attack',
      attacker: actor.instanceId,
      target: target.instanceId,
      abilityId: ability.id,
      abilityType: ability.type,
      damage: finalDmg,
      effectiveness,
      message: msg,
    });

    // Apply on-hit status
    if (ability.status && rng.chance(ability.status.chance)) {
      target.statuses.push({
        kind: ability.status.kind,
        turnsLeft: ability.status.turns + 1,
      });
      push({
        kind: 'status_apply',
        attacker: actor.instanceId,
        target: target.instanceId,
        message: `${target.name} is afflicted with ${ability.status.kind}!`,
      });
    }
    // Debuff
    if (ability.debuff && rng.chance(ability.debuff.chance)) {
      target.buffs.push({
        stat: ability.debuff.stat,
        pct: -Math.abs(ability.debuff.pct),
        turnsLeft: ability.debuff.turns + 1,
      });
      push({
        kind: 'buff',
        target: target.instanceId,
        message: `${target.name}'s ${ability.debuff.stat.toUpperCase()} fell!`,
      });
    }

    if (fainted) {
      push({
        kind: 'faint',
        target: target.instanceId,
        message: `${target.name} fainted!`,
      });
    }
  }
}

export function buildEnemyTeam(stage: StageDefinition): TeamSlot[] {
  // Place first up to 3 enemies in front, rest in back.
  return stage.enemies.map((cid, i) => {
    const position: Position = i < 3 ? 'front' : 'back';
    const slot = i + 1;
    const owned: OwnedCreature = {
      instanceId: `enemy-${stage.id}-${i}`,
      creatureId: cid,
      level: stage.enemyLevel,
      xp: 0,
      acquiredAt: 0,
    };
    return { owned, position, slot };
  });
}
