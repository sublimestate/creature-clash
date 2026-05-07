import { Ability } from '../types';

// ── Basic attacks (no cooldown, low power) ───────────────────────────
const basics: Record<string, Ability> = {
  scratch: {
    id: 'scratch',
    name: 'Scratch',
    type: 'normal',
    category: 'physical',
    power: 40,
    cooldown: 0,
    description: 'A quick claw swipe.',
  },
  bite: {
    id: 'bite',
    name: 'Bite',
    type: 'normal',
    category: 'physical',
    power: 45,
    cooldown: 0,
    description: 'A sharp bite.',
  },
  nip: {
    id: 'nip',
    name: 'Nip',
    type: 'normal',
    category: 'physical',
    power: 38,
    cooldown: 0,
    description: 'A quick nip — annoying but cheap.',
  },
  tackle: {
    id: 'tackle',
    name: 'Tackle',
    type: 'tough',
    category: 'physical',
    power: 42,
    cooldown: 0,
    description: 'A full-body slam.',
  },
  swat: {
    id: 'swat',
    name: 'Swat',
    type: 'normal',
    category: 'physical',
    power: 40,
    cooldown: 0,
    description: 'A casual paw-swat.',
  },
  bark: {
    id: 'bark',
    name: 'Bark',
    type: 'social',
    category: 'special',
    power: 35,
    cooldown: 0,
    description: 'A startling bark — small special damage.',
  },
};

// ── Predator specials ────────────────────────────────────────────────
const predator: Record<string, Ability> = {
  pounce: {
    id: 'pounce',
    name: 'Pounce',
    type: 'predator',
    category: 'physical',
    power: 65,
    cooldown: 3,
    description: 'A leaping strike. Chance to leave the target bleeding.',
    status: { kind: 'bleed', chance: 0.2, turns: 3 },
  },
  maul: {
    id: 'maul',
    name: 'Maul',
    type: 'predator',
    category: 'physical',
    power: 90,
    cooldown: 4,
    description: 'A vicious tearing strike.',
    status: { kind: 'bleed', chance: 0.4, turns: 3 },
  },
  fang_strike: {
    id: 'fang_strike',
    name: 'Fang Strike',
    type: 'predator',
    category: 'physical',
    power: 60,
    cooldown: 2,
    description: 'A precise fang into a weak point.',
    status: { kind: 'bleed', chance: 0.15, turns: 2 },
  },
};

// ── Swift specials ───────────────────────────────────────────────────
const swift: Record<string, Ability> = {
  dash: {
    id: 'dash',
    name: 'Dash',
    type: 'swift',
    category: 'physical',
    power: 55,
    cooldown: 2,
    description: 'A blink-fast charge that always strikes first.',
    priority: true,
  },
  zoomies: {
    id: 'zoomies',
    name: 'Zoomies',
    type: 'swift',
    category: 'physical',
    power: 60,
    cooldown: 3,
    description: 'Erratic high-speed run; can stun.',
    status: { kind: 'stun', chance: 0.15, turns: 2 },
  },
  pursue: {
    id: 'pursue',
    name: 'Pursue',
    type: 'swift',
    category: 'physical',
    power: 65,
    cooldown: 3,
    description: 'Chases the target down; lowers their speed.',
    debuff: { stat: 'spd', pct: 25, turns: 2, chance: 1.0 },
  },
};

// ── Tough specials ───────────────────────────────────────────────────
const tough: Record<string, Ability> = {
  brace: {
    id: 'brace',
    name: 'Brace',
    type: 'tough',
    category: 'buff',
    power: 0,
    cooldown: 4,
    description: 'Whole team buckles down. +30% DEF for 2 turns.',
    teamBuff: { stat: 'def', pct: 30, turns: 2 },
  },
  body_slam: {
    id: 'body_slam',
    name: 'Body Slam',
    type: 'tough',
    category: 'physical',
    power: 75,
    cooldown: 4,
    description: 'Heavy AOE slam — hits all foes.',
    aoe: true,
  },
  endure: {
    id: 'endure',
    name: 'Endure',
    type: 'tough',
    category: 'buff',
    power: 0,
    cooldown: 4,
    description: 'Hunkers down. +40% own SP_DEF for 2 turns.',
    selfBuff: { stat: 'spDef', pct: 40, turns: 2 },
  },
};

// ── Cunning specials ─────────────────────────────────────────────────
const cunning: Record<string, Ability> = {
  trick: {
    id: 'trick',
    name: 'Trick',
    type: 'cunning',
    category: 'special',
    power: 55,
    cooldown: 3,
    description: 'A sly feint; can daze the target.',
    status: { kind: 'daze', chance: 0.25, turns: 3 },
  },
  feint: {
    id: 'feint',
    name: 'Feint',
    type: 'cunning',
    category: 'special',
    power: 60,
    cooldown: 3,
    description: 'A psychological strike that lowers ATK.',
    debuff: { stat: 'atk', pct: 20, turns: 2, chance: 0.7 },
  },
  outsmart: {
    id: 'outsmart',
    name: 'Outsmart',
    type: 'cunning',
    category: 'buff',
    power: 0,
    cooldown: 4,
    description: 'Sees an opening. Buffs own SP_ATK.',
    selfBuff: { stat: 'spAtk', pct: 35, turns: 3 },
  },
};

// ── Social specials ──────────────────────────────────────────────────
const social: Record<string, Ability> = {
  pack_howl: {
    id: 'pack_howl',
    name: 'Pack Howl',
    type: 'social',
    category: 'buff',
    power: 0,
    cooldown: 5,
    description: 'Rallies the pack. Team ATK +25% for 3 turns.',
    teamBuff: { stat: 'atk', pct: 25, turns: 3 },
  },
  rally: {
    id: 'rally',
    name: 'Rally',
    type: 'social',
    category: 'heal',
    power: 35,
    cooldown: 5,
    description: 'A reassuring nuzzle. Recover 35% HP.',
  },
  group_pounce: {
    id: 'group_pounce',
    name: 'Group Pounce',
    type: 'social',
    category: 'physical',
    power: 70,
    cooldown: 4,
    description: 'The pack ganks one foe.',
  },
};

// ── Wild specials ────────────────────────────────────────────────────
const wild: Record<string, Ability> = {
  frenzy: {
    id: 'frenzy',
    name: 'Frenzy',
    type: 'wild',
    category: 'physical',
    power: 80,
    cooldown: 4,
    description: 'A wild rage — hits all foes.',
    aoe: true,
    status: { kind: 'bleed', chance: 0.1, turns: 2 },
  },
  snarl: {
    id: 'snarl',
    name: 'Snarl',
    type: 'wild',
    category: 'special',
    power: 60,
    cooldown: 3,
    description: 'A vicious snarl that drops enemy SPD.',
    debuff: { stat: 'spd', pct: 20, turns: 2, chance: 0.7 },
  },
  feral_lunge: {
    id: 'feral_lunge',
    name: 'Feral Lunge',
    type: 'wild',
    category: 'physical',
    power: 85,
    cooldown: 5,
    description: 'A reckless all-in. Heavy single-target damage.',
  },
};

export const ABILITIES: Record<string, Ability> = {
  ...basics,
  ...predator,
  ...swift,
  ...tough,
  ...cunning,
  ...social,
  ...wild,
};
