import { CreatureDefinition } from '../types';

// Stat budgets per rarity (sum target):
// Common: 270, Uncommon: 320, Rare: 375, Epic: 425, Legendary: 485
//
// Roster theme — the Neighborhood arc.
// Common/Uncommon: housepets and strays. Rare/Epic: feral mid-tier.
// Legendary: apex animals (lion, tiger, direwolf) — myths whispered between
// neighborhoods. Later chapters will bring in birds, reptiles, etc.

export const CREATURES: CreatureDefinition[] = [
  // ── Commons (BST ~270) ───────────────────────────────────────────
  {
    id: 'tabby',
    name: 'Tabby',
    type: 'predator',
    rarity: 'common',
    baseStats: { hp: 50, atk: 55, def: 35, spAtk: 30, spDef: 35, spd: 60 },
    abilities: ['scratch', 'pounce'],
    flavor: 'A neighborhood tabby with a hunter\'s patience. Mostly naps.',
  },
  {
    id: 'pup',
    name: 'Pup',
    type: 'social',
    rarity: 'common',
    baseStats: { hp: 55, atk: 45, def: 40, spAtk: 40, spDef: 40, spd: 50 },
    abilities: ['bite', 'pack_howl'],
    flavor: 'A young pup with more enthusiasm than skill.',
  },
  {
    id: 'yapper',
    name: 'Yapper',
    type: 'swift',
    rarity: 'common',
    baseStats: { hp: 45, atk: 35, def: 30, spAtk: 50, spDef: 35, spd: 75 },
    abilities: ['nip', 'dash'],
    flavor: 'A small terrier that moves faster than it thinks.',
  },
  {
    id: 'pugling',
    name: 'Pugling',
    type: 'tough',
    rarity: 'common',
    baseStats: { hp: 70, atk: 45, def: 60, spAtk: 25, spDef: 45, spd: 25 },
    abilities: ['tackle', 'brace'],
    flavor: 'Stocky and stubborn. Refuses to be moved.',
  },
  {
    id: 'sphynx',
    name: 'Sphynx',
    type: 'cunning',
    rarity: 'common',
    baseStats: { hp: 45, atk: 40, def: 35, spAtk: 55, spDef: 40, spd: 55 },
    abilities: ['scratch', 'trick'],
    flavor: 'Bald, alien, and uncannily smart.',
  },
  {
    id: 'mutt',
    name: 'Mutt',
    type: 'wild',
    rarity: 'common',
    baseStats: { hp: 55, atk: 55, def: 35, spAtk: 35, spDef: 35, spd: 55 },
    abilities: ['bite', 'snarl'],
    flavor: 'A scrappy stray with no fixed address.',
  },

  // ── Uncommons (BST ~320) ─────────────────────────────────────────
  {
    id: 'bengal',
    name: 'Bengal',
    type: 'predator',
    rarity: 'uncommon',
    baseStats: { hp: 60, atk: 70, def: 45, spAtk: 40, spDef: 45, spd: 60 },
    abilities: ['scratch', 'fang_strike'],
    flavor: 'Spotted, restless, half-wild — escapes the apartment weekly.',
  },
  {
    id: 'beagle',
    name: 'Beagle',
    type: 'social',
    rarity: 'uncommon',
    baseStats: { hp: 65, atk: 55, def: 50, spAtk: 45, spDef: 50, spd: 55 },
    abilities: ['bark', 'rally'],
    flavor: 'A pack hound — louder and braver in a group.',
  },
  {
    id: 'whippet',
    name: 'Whippet',
    type: 'swift',
    rarity: 'uncommon',
    baseStats: { hp: 55, atk: 50, def: 35, spAtk: 50, spDef: 45, spd: 85 },
    abilities: ['nip', 'pursue'],
    flavor: 'Built for speed. Built for nothing else.',
  },
  {
    id: 'maine',
    name: 'Maine',
    type: 'tough',
    rarity: 'uncommon',
    baseStats: { hp: 80, atk: 55, def: 70, spAtk: 35, spDef: 55, spd: 25 },
    abilities: ['tackle', 'endure'],
    flavor: 'A Maine Coon. Half cat, half rug.',
  },
  {
    id: 'vizsla',
    name: 'Vizsla',
    type: 'cunning',
    rarity: 'uncommon',
    baseStats: { hp: 60, atk: 55, def: 45, spAtk: 60, spDef: 45, spd: 55 },
    abilities: ['bite', 'feint'],
    flavor: 'A ginger hunting dog — clever, twitchy, devoted.',
  },

  // ── Rares (BST ~375) ─────────────────────────────────────────────
  {
    id: 'sable',
    name: 'Sable',
    type: 'swift',
    rarity: 'rare',
    baseStats: { hp: 70, atk: 60, def: 50, spAtk: 65, spDef: 55, spd: 75 },
    abilities: ['scratch', 'zoomies'],
    flavor: 'A sleek black cat. Moves like a rumour.',
  },
  {
    id: 'border',
    name: 'Border',
    type: 'cunning',
    rarity: 'rare',
    baseStats: { hp: 70, atk: 55, def: 50, spAtk: 80, spDef: 60, spd: 60 },
    abilities: ['nip', 'outsmart'],
    flavor: 'A border collie. Smarter than most of the team. Possibly all of it.',
  },
  {
    id: 'doberman',
    name: 'Doberman',
    type: 'predator',
    rarity: 'rare',
    baseStats: { hp: 75, atk: 85, def: 55, spAtk: 50, spDef: 55, spd: 55 },
    abilities: ['bite', 'maul'],
    flavor: 'A pristine guard dog with very firm boundaries.',
  },
  {
    id: 'husky',
    name: 'Husky',
    type: 'wild',
    rarity: 'rare',
    baseStats: { hp: 80, atk: 70, def: 55, spAtk: 60, spDef: 55, spd: 55 },
    abilities: ['bite', 'frenzy'],
    flavor: 'Ancient sled-dog blood; happiest in chaos.',
  },

  // ── Epics (BST ~425) ─────────────────────────────────────────────
  {
    id: 'mastiff',
    name: 'Mastiff',
    type: 'tough',
    rarity: 'epic',
    baseStats: { hp: 110, atk: 80, def: 90, spAtk: 35, spDef: 80, spd: 30 },
    abilities: ['tackle', 'body_slam'],
    flavor: 'The size of a small couch and twice as immovable.',
  },
  {
    id: 'lynx',
    name: 'Lynx',
    type: 'wild',
    rarity: 'epic',
    baseStats: { hp: 90, atk: 90, def: 65, spAtk: 60, spDef: 65, spd: 55 },
    abilities: ['scratch', 'feral_lunge'],
    flavor: 'A wildcat from the forest edges. Sometimes seen on porches.',
  },

  // ── Legendaries (BST ~485) ───────────────────────────────────────
  {
    id: 'lion',
    name: 'Lion',
    type: 'social',
    rarity: 'legendary',
    baseStats: { hp: 110, atk: 95, def: 75, spAtk: 70, spDef: 75, spd: 60 },
    abilities: ['fang_strike', 'pack_howl'],
    flavor: 'Legend. Pride leader. Allegedly visits the petting zoo at 3am.',
  },
  {
    id: 'tiger',
    name: 'Tiger',
    type: 'predator',
    rarity: 'legendary',
    baseStats: { hp: 100, atk: 110, def: 75, spAtk: 60, spDef: 75, spd: 65 },
    abilities: ['fang_strike', 'maul'],
    flavor: 'Apex. Solitary. Whispered about by every alley cat.',
  },
  {
    id: 'direwolf',
    name: 'Direwolf',
    type: 'wild',
    rarity: 'legendary',
    baseStats: { hp: 110, atk: 100, def: 75, spAtk: 65, spDef: 75, spd: 60 },
    abilities: ['bite', 'feral_lunge'],
    flavor: 'A wolf out of myth. The strays speak its name only at full moon.',
  },
];

export const CREATURES_BY_ID: Record<string, CreatureDefinition> = Object.fromEntries(
  CREATURES.map((c) => [c.id, c]),
);
