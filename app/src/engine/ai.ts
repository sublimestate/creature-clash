import { Ability, BattleCreature } from '../types';
import { typeMultiplier } from './types';

export interface ActionChoice {
  ability: Ability;
  targets: BattleCreature[];
}

// Available targets: front row first; back row only if front row is wiped.
export function targetableEnemies(enemies: BattleCreature[]): BattleCreature[] {
  const aliveFront = enemies.filter((e) => e.isAlive && e.position === 'front');
  if (aliveFront.length > 0) return aliveFront;
  return enemies.filter((e) => e.isAlive && e.position === 'back');
}

export function selectAction(
  attacker: BattleCreature,
  enemies: BattleCreature[],
  allies: BattleCreature[],
): ActionChoice | null {
  if (!attacker.isAlive) return null;

  const reachable = targetableEnemies(enemies);
  if (reachable.length === 0) return null;

  const ready = attacker.abilities.filter(
    (a) => (attacker.cooldowns[a.id] ?? 0) === 0,
  );
  if (ready.length === 0) {
    // Should not happen since basic attack has cooldown 0; fall through to first ability.
    return { ability: attacker.abilities[0], targets: [pickLowestHp(reachable)] };
  }

  // Priority 1: heal/buff if low HP and a self-buff is ready.
  const lowHp = attacker.hp / attacker.maxHp < 0.3;
  if (lowHp) {
    const buff = ready.find((a) => a.category === 'buff' || a.category === 'heal');
    if (buff) return { ability: buff, targets: [attacker] };
  }

  // Priority 2: special with type advantage on a reachable target.
  const special = ready.find((a) => a.category === 'special' || a.category === 'physical');
  if (special && special.aoe) {
    return { ability: special, targets: reachable };
  }

  // Score targets by (effectiveness, then lowest HP).
  let bestTarget = reachable[0];
  let bestScore = -Infinity;
  let bestAbility = ready[0];

  for (const ability of ready) {
    if (ability.category === 'buff' || ability.category === 'heal') continue;
    for (const t of reachable) {
      const { multiplier } = typeMultiplier(ability.type, t.type);
      const hpScore = 1 - t.hp / t.maxHp; // prefer wounded targets
      const score = multiplier * 10 + hpScore + ability.power / 100;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = t;
        bestAbility = ability;
      }
    }
  }

  if (bestAbility.aoe) return { ability: bestAbility, targets: reachable };
  return { ability: bestAbility, targets: [bestTarget] };
}

function pickLowestHp(arr: BattleCreature[]): BattleCreature {
  return [...arr].sort((a, b) => a.hp - b.hp)[0];
}
