import { Ability, BattleCreature, Effectiveness } from '../types';
import { typeMultiplier } from './types';
import { Rng } from './rng';
import { effectiveStat } from './buffs';

export interface DamageResult {
  damage: number;
  effectiveness: Effectiveness;
  multiplier: number;
}

export function computeDamage(
  attacker: BattleCreature,
  defender: BattleCreature,
  ability: Ability,
  rng: Rng,
): DamageResult {
  if (ability.power <= 0) {
    return { damage: 0, effectiveness: 'normal', multiplier: 1 };
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
  const damage = Math.max(1, Math.round(base * multiplier * variance));

  return { damage, effectiveness, multiplier };
}
