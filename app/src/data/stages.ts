import { StageDefinition } from '../types';

// Chapter 1: The Backyard. Friendly territory. Easing in.
// Chapter 2: The Strays. Things get rougher. Tone darkens slightly.
// Later chapters (not yet built): The Park, The Sewers, The Forest Edge —
// each will introduce new species (birds, reptiles, etc.).

export const STAGES: StageDefinition[] = [
  {
    id: 'c1s1',
    name: 'Backyard Tussle',
    chapter: 1,
    index: 1,
    enemyLevel: 2,
    enemies: ['pup', 'tabby'],
    goldReward: 50,
    xpReward: 30,
  },
  {
    id: 'c1s2',
    name: 'Garden Hose Standoff',
    chapter: 1,
    index: 2,
    enemyLevel: 3,
    enemies: ['yapper', 'sphynx', 'tabby'],
    goldReward: 70,
    xpReward: 45,
  },
  {
    id: 'c1s3',
    name: 'Porch Patrol',
    chapter: 1,
    index: 3,
    enemyLevel: 4,
    enemies: ['pugling', 'pugling', 'mutt'],
    goldReward: 90,
    xpReward: 60,
  },
  {
    id: 'c1s4',
    name: 'Picket Fence Brawl',
    chapter: 1,
    index: 4,
    enemyLevel: 5,
    enemies: ['sphynx', 'vizsla', 'yapper'],
    goldReward: 110,
    xpReward: 75,
  },
  {
    id: 'c1s5',
    name: 'Top Cat — Block Champion',
    chapter: 1,
    index: 5,
    enemyLevel: 7,
    enemies: ['bengal', 'tabby', 'tabby', 'pup'],
    goldReward: 180,
    xpReward: 120,
  },
  {
    id: 'c2s1',
    name: 'Alley Skirmish',
    chapter: 2,
    index: 1,
    enemyLevel: 8,
    enemies: ['mutt', 'mutt', 'sphynx'],
    goldReward: 130,
    xpReward: 90,
  },
  {
    id: 'c2s2',
    name: 'Dumpster Diplomacy',
    chapter: 2,
    index: 2,
    enemyLevel: 9,
    enemies: ['beagle', 'mutt', 'mutt', 'pugling'],
    goldReward: 150,
    xpReward: 110,
  },
  {
    id: 'c2s3',
    name: 'Shortcut Through the Lot',
    chapter: 2,
    index: 3,
    enemyLevel: 10,
    enemies: ['whippet', 'mutt', 'sphynx', 'yapper'],
    goldReward: 170,
    xpReward: 130,
  },
  {
    id: 'c2s4',
    name: 'Rooftop Confrontation',
    chapter: 2,
    index: 4,
    enemyLevel: 11,
    enemies: ['sable', 'bengal', 'sphynx'],
    goldReward: 200,
    xpReward: 150,
  },
  {
    id: 'c2s5',
    name: 'Stray King — Boss',
    chapter: 2,
    index: 5,
    enemyLevel: 13,
    enemies: ['husky', 'mutt', 'beagle', 'whippet', 'border'],
    goldReward: 350,
    xpReward: 240,
  },
];

export const STAGES_BY_ID: Record<string, StageDefinition> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
);
