export type CreatureType =
  | 'predator'
  | 'swift'
  | 'tough'
  | 'cunning'
  | 'social'
  | 'wild'
  | 'normal';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Position = 'front' | 'back';

export type AbilityCategory = 'physical' | 'special' | 'buff' | 'debuff' | 'heal';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface Ability {
  id: string;
  name: string;
  type: CreatureType;
  category: AbilityCategory;
  power: number;
  cooldown: number;
  description: string;
  // Optional effects
  aoe?: boolean;
  priority?: boolean;
  selfBuff?: { stat: keyof Stats; pct: number; turns: number };
  teamBuff?: { stat: keyof Stats; pct: number; turns: number };
  debuff?: { stat: keyof Stats; pct: number; turns: number; chance: number };
  status?: { kind: StatusKind; chance: number; turns: number };
}

export type StatusKind = 'bleed' | 'stun' | 'daze';

export interface CreatureDefinition {
  id: string;
  name: string;
  type: CreatureType;
  rarity: Rarity;
  baseStats: Stats;
  abilities: [string, string]; // [basicAbilityId, specialAbilityId]
  flavor: string;
}

export interface OwnedCreature {
  instanceId: string;
  creatureId: string;
  level: number;
  xp: number;
  acquiredAt: number;
  nickname?: string;
}

export interface BattleCreature {
  instanceId: string;
  creatureId: string;
  name: string;
  type: CreatureType;
  level: number;
  side: 'player' | 'enemy';
  position: Position;
  slot: number;
  stats: Stats;
  maxHp: number;
  hp: number;
  abilities: Ability[];
  cooldowns: Record<string, number>;
  buffs: ActiveBuff[];
  statuses: ActiveStatus[];
  isAlive: boolean;
}

export interface ActiveBuff {
  stat: keyof Stats;
  pct: number;
  turnsLeft: number;
}

export interface ActiveStatus {
  kind: StatusKind;
  turnsLeft: number;
}

export type Effectiveness = 'super' | 'normal' | 'weak' | 'immune';

export interface BattleEvent {
  kind:
    | 'attack'
    | 'buff'
    | 'heal'
    | 'status_apply'
    | 'status_tick'
    | 'faint'
    | 'turn_start'
    | 'battle_end';
  attacker?: string; // instanceId
  target?: string; // instanceId
  targets?: string[]; // for AOE
  abilityId?: string;
  damage?: number;
  effectiveness?: Effectiveness;
  message: string;
  // Type of ability for visual effects (only on attack/heal events)
  abilityType?: CreatureType;
  // Snapshot of creature HP after event for UI sync
  hpAfter?: Record<string, number>;
  // Active status kinds per instanceId (only populated when changed in-event or
  // at turn boundaries — UI may treat absence as "no change").
  statusesAfter?: Record<string, StatusKind[]>;
  // Cooldown turns left per instanceId.abilityId
  cooldownsAfter?: Record<string, Record<string, number>>;
}

export interface BattleResult {
  winner: 'player' | 'enemy';
  events: BattleEvent[];
  turnsTaken: number;
  playerSurvivors: number;
  finalState: Record<string, { hp: number; isAlive: boolean }>;
}

export interface StageDefinition {
  id: string;
  name: string;
  chapter: number;
  index: number;
  enemyLevel: number;
  enemies: string[]; // creature ids (length 1-5)
  goldReward: number;
  xpReward: number;
}
