import { StageDefinition } from '../types';

// Stage balance assumptions:
// - Player starts with 2 pets at level 3 (STARTER_LEVEL).
// - Player levels up via XP rewards across stages.
// - Player recruits new pets stochastically (rollRecruitment) starting at
//   c1s1 — expected ~1 recruit per 2 stages on the early commons.
// - Bosses (c*s5) are intentionally harder than the surrounding stages.
//
// See src/engine/__tests__/balance.test.ts for win-rate simulations.

export const STAGES: StageDefinition[] = [
  {
    id: 'c1s1',
    name: 'Backyard Tussle',
    chapter: 1,
    index: 1,
    enemyLevel: 1,
    enemies: ['pup'],
    goldReward: 50,
    xpReward: 80,
  },
  {
    id: 'c1s2',
    name: 'Garden Hose Standoff',
    chapter: 1,
    index: 2,
    enemyLevel: 2,
    enemies: ['yapper', 'tabby'],
    goldReward: 70,
    xpReward: 110,
  },
  {
    id: 'c1s3',
    name: 'Porch Patrol',
    chapter: 1,
    index: 3,
    enemyLevel: 2,
    enemies: ['pugling', 'pup'],
    goldReward: 90,
    xpReward: 140,
  },
  {
    id: 'c1s4',
    name: 'Picket Fence Brawl',
    chapter: 1,
    index: 4,
    enemyLevel: 4,
    enemies: ['sphynx', 'vizsla', 'yapper'],
    goldReward: 110,
    xpReward: 170,
  },
  {
    id: 'c1s5',
    name: 'Top Cat — Block Champion',
    chapter: 1,
    index: 5,
    enemyLevel: 5,
    enemies: ['bengal', 'tabby', 'pup'],
    goldReward: 180,
    xpReward: 260,
  },
  {
    id: 'c2s1',
    name: 'Alley Skirmish',
    chapter: 2,
    index: 1,
    enemyLevel: 6,
    enemies: ['mutt', 'mutt', 'sphynx'],
    goldReward: 130,
    xpReward: 200,
  },
  {
    id: 'c2s2',
    name: 'Dumpster Diplomacy',
    chapter: 2,
    index: 2,
    enemyLevel: 7,
    enemies: ['beagle', 'mutt', 'pugling'],
    goldReward: 150,
    xpReward: 240,
  },
  {
    id: 'c2s3',
    name: 'Shortcut Through the Lot',
    chapter: 2,
    index: 3,
    enemyLevel: 8,
    enemies: ['whippet', 'mutt', 'sphynx', 'yapper'],
    goldReward: 170,
    xpReward: 280,
  },
  {
    id: 'c2s4',
    name: 'Rooftop Confrontation',
    chapter: 2,
    index: 4,
    enemyLevel: 9,
    enemies: ['sable', 'bengal', 'sphynx'],
    goldReward: 200,
    xpReward: 320,
  },
  {
    id: 'c2s5',
    name: 'Stray King — Boss',
    chapter: 2,
    index: 5,
    enemyLevel: 10,
    enemies: ['husky', 'mutt', 'beagle', 'whippet', 'border'],
    goldReward: 380,
    xpReward: 560,
  },

  // ── Chapter 3: The Park ──────────────────────────────────────────
  // Introduces birds. The neighborhood's quiet — the park is not.
  {
    id: 'c3s1',
    name: 'Bench Squabble',
    chapter: 3,
    index: 1,
    enemyLevel: 11,
    enemies: ['pigeon', 'yapper', 'pigeon', 'pigeon'],
    goldReward: 200,
    xpReward: 280,
  },
  {
    id: 'c3s2',
    name: 'The Murder Watches',
    chapter: 3,
    index: 2,
    enemyLevel: 12,
    enemies: ['crow', 'pigeon', 'mutt'],
    goldReward: 240,
    xpReward: 320,
  },
  {
    id: 'c3s3',
    name: 'Picnic Interrupted',
    chapter: 3,
    index: 3,
    enemyLevel: 13,
    enemies: ['crow', 'crow', 'pigeon', 'yapper'],
    goldReward: 280,
    xpReward: 360,
  },
  {
    id: 'c3s4',
    name: 'Talons in the Trees',
    chapter: 3,
    index: 4,
    enemyLevel: 14,
    enemies: ['hawk', 'crow', 'pigeon', 'mutt'],
    goldReward: 320,
    xpReward: 420,
  },
  {
    id: 'c3s5',
    name: 'Night Court — Boss',
    chapter: 3,
    index: 5,
    enemyLevel: 14,
    enemies: ['owl', 'hawk', 'crow', 'pigeon', 'pigeon'],
    goldReward: 520,
    xpReward: 780,
  },
];

export const STAGES_BY_ID: Record<string, StageDefinition> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
);
