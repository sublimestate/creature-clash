// Informational test — never fails. Simulates each stage against several
// "what does the player look like at this point" snapshots and logs the
// win rate. Use the output to spot stages outside the 40-90% target band.

import { describe, it } from 'vitest';
import { buildEnemyTeam, simulateBattle, TeamSlot } from '../battle';
import { STAGES } from '../../data/stages';
import { OwnedCreature, Position } from '../../types';

function ownedAt(creatureId: string, level: number, idx = 0): OwnedCreature {
  return {
    instanceId: `bal-${creatureId}-${idx}`,
    creatureId,
    level,
    xp: 0,
    acquiredAt: 0,
  };
}

function slot(o: OwnedCreature, position: Position, slot: number): TeamSlot {
  return { owned: o, position, slot };
}

interface Scenario {
  name: string;
  team: (stage: { enemyLevel: number; index: number; chapter: number }) => TeamSlot[];
}

// Models for "where is the player at this stage in normal play":
// - "starter": just the 2 starters they picked, no recruits, level matches enemy
// - "progressed": 2 starters slightly over-leveled (XP rewards stack), no recruits
// - "recruited": 3 pets including one mid-game recruit, slightly over-leveled
const SCENARIOS: Scenario[] = [
  {
    name: 'starter ',
    team: (s) => [
      slot(ownedAt('tabby', s.enemyLevel, 0), 'front', 1),
      slot(ownedAt('sphynx', s.enemyLevel, 1), 'front', 2),
    ],
  },
  {
    name: 'recruited',
    team: (s) => [
      slot(ownedAt('tabby', s.enemyLevel + 1, 0), 'front', 1),
      slot(ownedAt('sphynx', s.enemyLevel + 1, 1), 'front', 2),
      slot(ownedAt('pugling', s.enemyLevel, 2), 'front', 3),
    ],
  },
  {
    name: 'veteran  ',
    team: (s) => [
      slot(ownedAt('tabby', s.enemyLevel + 1, 0), 'front', 1),
      slot(ownedAt('sphynx', s.enemyLevel + 1, 1), 'front', 2),
      slot(ownedAt('pugling', s.enemyLevel + 1, 2), 'front', 3),
      slot(ownedAt('mutt', s.enemyLevel + 1, 3), 'back', 4),
    ],
  },
  {
    name: 'champion ',
    team: (s) => [
      slot(ownedAt('tabby', s.enemyLevel + 2, 0), 'front', 1),
      slot(ownedAt('sphynx', s.enemyLevel + 2, 1), 'front', 2),
      slot(ownedAt('pugling', s.enemyLevel + 2, 2), 'front', 3),
      slot(ownedAt('mutt', s.enemyLevel + 2, 3), 'back', 4),
      slot(ownedAt('pup', s.enemyLevel + 2, 4), 'back', 5),
    ],
  },
];

describe('balance — stage win rates', () => {
  it('logs win rate per stage across player progression scenarios', () => {
    const TRIALS = 100;
    const lines: string[] = [];
    lines.push('');
    lines.push('--- Stage win rates by player progression ---');
    lines.push('stage             | starter | recruited | veteran | champion');
    lines.push('------------------|---------|-----------|---------|---------');

    for (const stage of STAGES) {
      const enemySlots = buildEnemyTeam(stage);
      const cells: string[] = [];
      for (const s of SCENARIOS) {
        const playerSlots = s.team(stage);
        let wins = 0;
        for (let i = 0; i < TRIALS; i++) {
          const seed = (stage.id.charCodeAt(0) << 16) + i * 31 + 1;
          if (simulateBattle(playerSlots, enemySlots, seed).winner === 'player') {
            wins++;
          }
        }
        cells.push(`${((wins / TRIALS) * 100).toFixed(0).padStart(3)}%`);
      }
      const [a, b, c, d] = cells;
      lines.push(
        `${stage.id.padEnd(17)} |    ${a} |      ${b} |    ${c} |     ${d}`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  });
});
