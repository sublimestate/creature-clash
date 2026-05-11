import { Ability, BattleCreature, CreatureType, Stats } from '../types';
import { effectiveStat } from './buffs';
import { typeMultiplier } from './types';

export interface ActionChoice {
  ability: Ability;
  targets: BattleCreature[];
}

// ── Reachable enemies (back row protected while front lives) ─────────

export function targetableEnemies(enemies: BattleCreature[]): BattleCreature[] {
  const aliveFront = enemies.filter((e) => e.isAlive && e.position === 'front');
  if (aliveFront.length > 0) return aliveFront;
  return enemies.filter((e) => e.isAlive && e.position === 'back');
}

// ── Per-role personality dispatch ────────────────────────────────────
//
// Each role has a distinct AI policy. See README/docs for the full table —
// Predator hunts wounded prey, Swift exploits priority, Tough anchors with
// buffs and AOE, Cunning sabotages threats, Social supports the team,
// Wild always uses the biggest ability available.

export function selectAction(
  attacker: BattleCreature,
  enemies: BattleCreature[],
  allies: BattleCreature[],
): ActionChoice | null {
  if (!attacker.isAlive) return null;
  const reachable = targetableEnemies(enemies);
  if (reachable.length === 0) return null;

  const ready = readyAbilities(attacker);
  if (ready.length === 0) return null;

  switch (attacker.type) {
    case 'predator':
      return hunterPolicy(attacker, reachable, ready);
    case 'swift':
      return skirmisherPolicy(attacker, reachable, ready);
    case 'tough':
      return anchorPolicy(attacker, reachable, ready, allies);
    case 'cunning':
      return saboteurPolicy(attacker, reachable, ready);
    case 'social':
      return supporterPolicy(attacker, reachable, ready, allies);
    case 'wild':
      return berserkerPolicy(attacker, reachable, ready);
    default:
      return defaultPolicy(attacker, reachable, ready);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function readyAbilities(c: BattleCreature): Ability[] {
  return c.abilities.filter((a) => (c.cooldowns[a.id] ?? 0) === 0);
}

function pickBy<T>(arr: T[], score: (x: T) => number): T {
  let best = arr[0];
  let bestScore = -Infinity;
  for (const item of arr) {
    const s = score(item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

function lowestHp(arr: BattleCreature[]): BattleCreature {
  return pickBy(arr, (c) => -c.hp);
}

function highestStat(arr: BattleCreature[], key: keyof Stats): BattleCreature {
  return pickBy(arr, (c) => effectiveStat(c, key));
}

function lowestStat(arr: BattleCreature[], key: keyof Stats): BattleCreature {
  return pickBy(arr, (c) => -effectiveStat(c, key));
}

// Effective damage estimate against a single target, for AI scoring.
function damageScore(actor: BattleCreature, ability: Ability, target: BattleCreature): number {
  if (ability.power <= 0) return 0;
  const isSpecial = ability.category === 'special';
  const atk = isSpecial ? effectiveStat(actor, 'spAtk') : effectiveStat(actor, 'atk');
  const def = isSpecial ? effectiveStat(target, 'spDef') : effectiveStat(target, 'def');
  const { multiplier } = typeMultiplier(ability.type, target.type);
  return ability.power * (atk / Math.max(1, def)) * multiplier;
}

// Has this creature already received the buff this ability would apply?
function alreadyHasBuff(c: BattleCreature, stat: keyof Stats, positive: boolean): boolean {
  return c.buffs.some((b) =>
    b.stat === stat && (positive ? b.pct > 0 : b.pct < 0),
  );
}

function biggestDamageAbility(ready: Ability[]): Ability | null {
  let best: Ability | null = null;
  let bestPower = 0;
  for (const a of ready) {
    if (a.power > bestPower) {
      bestPower = a.power;
      best = a;
    }
  }
  return best;
}

// ── Role policies ────────────────────────────────────────────────────

// Predator — Hunter. Finishes wounded prey. Greedy with specials when a
// kill is in range, otherwise basic-attacks the lowest-HP target.
function hunterPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
): ActionChoice {
  const damaging = ready.filter((a) => a.power > 0);
  const target = lowestHp(reachable);
  if (damaging.length === 0) {
    return { ability: ready[0], targets: [target] };
  }
  // Among ready damaging abilities, pick the one with highest expected damage
  // on the wounded target.
  const ability = pickBy(damaging, (a) => damageScore(actor, a, target));
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [target] };
}

// Swift — Skirmisher. Priority ability first. Targets the squishiest defense
// stat for whichever attack category the ability uses.
function skirmisherPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
): ActionChoice {
  const priority = ready.find((a) => a.priority);
  const ability = priority ?? pickBy(ready.filter((a) => a.power > 0), (a) => a.power) ?? ready[0];
  const stat: keyof Stats = ability.category === 'special' ? 'spDef' : 'def';
  const target = lowestStat(reachable, stat);
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [target] };
}

// Tough — Anchor. Stacks team DEF first. AOE when 3+ enemies alive.
// Otherwise tanks the lowest-HP front enemy.
function anchorPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
  allies: BattleCreature[],
): ActionChoice {
  const aliveAllies = allies.filter((a) => a.isAlive);
  // Team buff if not already up on this actor (proxy for whole team).
  const teamBuff = ready.find(
    (a) =>
      a.teamBuff &&
      !alreadyHasBuff(actor, a.teamBuff.stat, a.teamBuff.pct > 0),
  );
  if (teamBuff) return { ability: teamBuff, targets: aliveAllies };

  // AOE when the board is full
  const aoe = ready.find((a) => a.aoe && a.power > 0);
  if (aoe && reachable.length >= 3) {
    return { ability: aoe, targets: reachable };
  }

  // Self-buff defense if not already on
  const selfBuff = ready.find(
    (a) =>
      a.selfBuff &&
      !alreadyHasBuff(actor, a.selfBuff.stat, a.selfBuff.pct > 0),
  );
  if (selfBuff) return { ability: selfBuff, targets: [actor] };

  // Otherwise hit the lowest-HP front target
  const target = lowestHp(reachable);
  const damaging = ready.filter((a) => a.power > 0);
  const ability = damaging.length > 0
    ? pickBy(damaging, (a) => damageScore(actor, a, target))
    : ready[0];
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [target] };
}

// Cunning — Saboteur. Self-buffs SP.ATK first, then debuffs the highest-ATK
// enemy threat.
function saboteurPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
): ActionChoice {
  const selfBuff = ready.find(
    (a) =>
      a.selfBuff &&
      !alreadyHasBuff(actor, a.selfBuff.stat, a.selfBuff.pct > 0),
  );
  if (selfBuff) return { ability: selfBuff, targets: [actor] };

  const threat = highestStat(reachable, 'atk');
  const debuff = ready.find((a) => a.debuff);
  if (debuff) return { ability: debuff, targets: [threat] };

  const damaging = ready.filter((a) => a.power > 0);
  if (damaging.length === 0) return { ability: ready[0], targets: [threat] };
  const ability = pickBy(damaging, (a) => damageScore(actor, a, threat));
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [threat] };
}

// Social — Supporter. Pack Howl / team buff first. Self-heal when below
// 50% HP. Otherwise attacks the lowest-HP front enemy.
function supporterPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
  allies: BattleCreature[],
): ActionChoice {
  const aliveAllies = allies.filter((a) => a.isAlive);

  const teamBuff = ready.find(
    (a) =>
      a.teamBuff &&
      !alreadyHasBuff(actor, a.teamBuff.stat, a.teamBuff.pct > 0),
  );
  if (teamBuff) return { ability: teamBuff, targets: aliveAllies };

  const heal = ready.find((a) => a.category === 'heal');
  if (heal && actor.hp / actor.maxHp < 0.5) {
    return { ability: heal, targets: [actor] };
  }

  const target = lowestHp(reachable);
  const damaging = ready.filter((a) => a.power > 0);
  if (damaging.length === 0) return { ability: ready[0], targets: [target] };
  const ability = pickBy(damaging, (a) => damageScore(actor, a, target));
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [target] };
}

// Wild — Berserker. Always uses the highest-power ability available.
// Targets the lowest-HP enemy (kills are sweeter for berserkers too).
function berserkerPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
): ActionChoice {
  const damaging = ready.filter((a) => a.power > 0);
  const ability =
    biggestDamageAbility(damaging) ?? ready[0];
  const target = lowestHp(reachable);
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [target] };
}

// Generic fallback for any non-roled creature (e.g. normal type).
function defaultPolicy(
  actor: BattleCreature,
  reachable: BattleCreature[],
  ready: Ability[],
): ActionChoice {
  const target = lowestHp(reachable);
  const damaging = ready.filter((a) => a.power > 0);
  if (damaging.length === 0) return { ability: ready[0], targets: [target] };
  const ability = pickBy(damaging, (a) => damageScore(actor, a, target));
  if (ability.aoe) return { ability, targets: reachable };
  return { ability, targets: [target] };
}

// Re-export for tests
export type { CreatureType };
