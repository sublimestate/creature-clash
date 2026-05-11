import { CREATURES_BY_ID } from '../data/creatures';
import { Rarity } from '../types';
import { Rng } from './rng';

// Drop chance to recruit a defeated enemy, by rarity, at 3-star clear.
// Modified at runtime by stars earned and whether the species is already
// in the player's pack.
const BASE_RATES: Record<Rarity, number> = {
  common: 0.35,
  uncommon: 0.22,
  rare: 0.12,
  epic: 0.05,
  legendary: 0.02,
};

// 3 stars → full rate, 2 stars → 75%, 1 star → 50%.
const STAR_MULTIPLIERS: Record<number, number> = {
  3: 1.0,
  2: 0.75,
  1: 0.5,
};

// Cuts the chance in half if you already own this species, but never to
// zero — duplicates can trickle in.
const DUPLICATE_MULTIPLIER = 0.5;

export interface RecruitRoll {
  creatureId: string;
  rarity: Rarity;
  // Effective rate the roll passed at (for telemetry / future tuning).
  rate: number;
}

// Pure: given defeated enemies and stars earned, returns at most one
// recruit (the rarest creature whose roll passed). One recruit per battle
// keeps "joined your pack" feeling like a moment, not a footnote.
export function rollRecruitment(args: {
  enemyCreatureIds: readonly string[];
  stars: number;
  ownedSpeciesIds: ReadonlySet<string>;
  rng: Rng;
}): RecruitRoll | null {
  const starMult = STAR_MULTIPLIERS[args.stars] ?? 0.5;
  const passed: RecruitRoll[] = [];

  // Dedup by creatureId — fighting two of the same species shouldn't double
  // your chances.
  const seen = new Set<string>();
  for (const cid of args.enemyCreatureIds) {
    if (seen.has(cid)) continue;
    seen.add(cid);
    const def = CREATURES_BY_ID[cid];
    if (!def) continue;
    const dupMult = args.ownedSpeciesIds.has(cid) ? DUPLICATE_MULTIPLIER : 1.0;
    const rate = BASE_RATES[def.rarity] * starMult * dupMult;
    if (args.rng.chance(rate)) {
      passed.push({ creatureId: cid, rarity: def.rarity, rate });
    }
  }

  if (passed.length === 0) return null;

  // Prefer rarer recruits when multiple rolls pass.
  const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  passed.sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity),
  );
  return passed[0];
}
