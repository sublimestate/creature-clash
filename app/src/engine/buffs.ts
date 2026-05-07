import { BattleCreature, Stats } from '../types';

export function effectiveStat(c: BattleCreature, key: keyof Stats): number {
  let value = c.stats[key];
  for (const buff of c.buffs) {
    if (buff.stat === key) value *= 1 + buff.pct / 100;
  }
  return value;
}

export function tickBuffs(c: BattleCreature): void {
  c.buffs = c.buffs
    .map((b) => ({ ...b, turnsLeft: b.turnsLeft - 1 }))
    .filter((b) => b.turnsLeft > 0);
}
