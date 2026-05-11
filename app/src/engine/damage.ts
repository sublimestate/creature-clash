import { Ability, BattleCreature, Effectiveness } from '../types';
import { typeMultiplier } from './types';
import { Rng } from './rng';
import { effectiveStat } from './buffs';

export interface DamageResult {
  damage: number;
  effectiveness: Effectiveness;
  multiplier: number;
  isCrit: boolean;
  dodged: boolean;
}

// SPD differential drives both crit and dodge.
// Faster attacker → crit up to 25% (1.5× damage).
// Faster defender → dodge up to 20% (attack misses entirely).
// Equal SPD = 0% on both → no variance added when teams are balanced.
const CRIT_CAP = 0.25;
const DODGE_CAP = 0.2;
const CRIT_MULTIPLIER = 1.5;
const SPEED_DIVISOR = 200;

export function critChance(attacker: BattleCreature, defender: BattleCreature): number {
  const aSpd = effectiveStat(attacker, 'spd');
  const dSpd = effectiveStat(defender, 'spd');
  const diff = aSpd - dSpd;
  if (diff <= 0) return 0;
  return Math.min(CRIT_CAP, diff / SPEED_DIVISOR);
}

export function dodgeChance(attacker: BattleCreature, defender: BattleCreature): number {
  const aSpd = effectiveStat(attacker, 'spd');
  const dSpd = effectiveStat(defender, 'spd');
  const diff = dSpd - aSpd;
  if (diff <= 0) return 0;
  return Math.min(DODGE_CAP, diff / SPEED_DIVISOR);
}

export function computeDamage(
  attacker: BattleCreature,
  defender: BattleCreature,
  ability: Ability,
  rng: Rng,
): DamageResult {
  if (ability.power <= 0) {
    return {
      damage: 0,
      effectiveness: 'normal',
      multiplier: 1,
      isCrit: false,
      dodged: false,
    };
  }

  // Roll dodge before anything else — a dodged hit deals no damage and
  // skips status/debuff application (handled in executeAbility).
  if (rng.chance(dodgeChance(attacker, defender))) {
    return {
      damage: 0,
      effectiveness: 'normal',
      multiplier: 1,
      isCrit: false,
      dodged: true,
    };
  }

  const isSpecial = ability.category === 'special';
  const atk = isSpecial
    ? effectiveStat(attacker, 'spAtk')
    : effectiveStat(attacker, 'atk');
  const def = isSpecial
    ? effectiveStat(defender, 'spDef')
    : effectiveStat(defender, 'def');

  const base =
    ((2 * attacker.level) / 5 + 2) * ability.power * (atk / Math.max(1, def)) /
      50 +
    2;

  const { multiplier, effectiveness } = typeMultiplier(ability.type, defender.type);
  const variance = rng.range(0.85, 1.0);
  const isCrit = rng.chance(critChance(attacker, defender));
  const critMult = isCrit ? CRIT_MULTIPLIER : 1;

  const damage = Math.max(1, Math.round(base * multiplier * variance * critMult));

  return { damage, effectiveness, multiplier, isCrit, dodged: false };
}
