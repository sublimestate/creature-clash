import { CreatureType, Effectiveness } from '../types';

// STRONG_AGAINST[X] = roles that role X is super-effective against (1.5×).
// Predator > Swift, Wild — speed gets caught, ferals get dominated.
// Swift > Tough, Cunning — mobility beats armor, faster than thinking.
// Tough > Wild, Social — armor weathers chaos and stands against the pack.
// Cunning > Predator, Tough — outsmarts brute, finds the weak point.
// Social > Predator, Cunning — numbers vs lone hunter, pack vision.
// Wild > Social, Swift — chaos disrupts coordination and unpredictability breaks formations.
const STRONG_AGAINST: Record<CreatureType, CreatureType[]> = {
  predator: ['swift', 'wild'],
  swift: ['tough', 'cunning'],
  tough: ['wild', 'social'],
  cunning: ['predator', 'tough'],
  social: ['predator', 'cunning'],
  wild: ['social', 'swift'],
  normal: [],
};

// WEAK_AGAINST[X] = roles that X is weak against (0.67× when X attacks them).
const WEAK_AGAINST: Record<CreatureType, CreatureType[]> = {
  predator: ['cunning', 'social'],
  swift: ['predator', 'wild'],
  tough: ['swift', 'cunning'],
  cunning: ['swift', 'social'],
  social: ['tough', 'wild'],
  wild: ['predator', 'tough'],
  normal: [],
};

export function typeMultiplier(
  attackerType: CreatureType,
  defenderType: CreatureType,
): { multiplier: number; effectiveness: Effectiveness } {
  if (attackerType === 'normal' || defenderType === 'normal') {
    return { multiplier: 1, effectiveness: 'normal' };
  }
  if (STRONG_AGAINST[attackerType]?.includes(defenderType)) {
    return { multiplier: 1.5, effectiveness: 'super' };
  }
  if (WEAK_AGAINST[attackerType]?.includes(defenderType)) {
    return { multiplier: 0.67, effectiveness: 'weak' };
  }
  return { multiplier: 1, effectiveness: 'normal' };
}

// Visual identity for each role. Picked for warmth + readability against the
// dark UI; will be reused as placeholder sprite color, type pills, hit flashes.
export const TYPE_COLORS: Record<CreatureType, string> = {
  predator: '#E54B4B', // crimson — claws, blood
  swift: '#FFD93D',    // sun yellow — speed lines
  tough: '#7B6CF6',    // armor purple — heft
  cunning: '#3DD68C',  // emerald — mischief
  social: '#FF9F43',   // warm orange — pack warmth
  wild: '#9CA8B8',     // grey — feral fur
  normal: '#A0A0A0',
};
