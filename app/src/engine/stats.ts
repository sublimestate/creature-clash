import { CreatureDefinition, Rarity, Stats } from '../types';

const RARITY_GROWTH: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.06,
  rare: 1.12,
  epic: 1.18,
  legendary: 1.25,
};

// Compute level-scaled stats. Level 1 = base. Each level +(growth-1)*~0.04*base per level,
// equivalent to multiplying base by (1 + (level - 1) * growth_factor).
export function statsAtLevel(def: CreatureDefinition, level: number): Stats {
  const growth = RARITY_GROWTH[def.rarity];
  const factor = 1 + (level - 1) * 0.04 * growth;
  const b = def.baseStats;
  return {
    hp: Math.round(b.hp * factor),
    atk: Math.round(b.atk * factor),
    def: Math.round(b.def * factor),
    spAtk: Math.round(b.spAtk * factor),
    spDef: Math.round(b.spDef * factor),
    spd: Math.round(b.spd * factor),
  };
}

// XP curve: xp needed to reach next level
export function xpForLevel(level: number): number {
  return Math.round(50 * Math.pow(level, 1.5));
}
