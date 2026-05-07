import { describe, expect, it } from 'vitest';
import { Rng } from '../rng';
import { typeMultiplier } from '../types';
import { computeDamage } from '../damage';
import { statsAtLevel } from '../stats';
import { CREATURES_BY_ID } from '../../data/creatures';
import { ABILITIES } from '../../data/abilities';
import { simulateBattle, makeBattleCreature, buildEnemyTeam, TeamSlot } from '../battle';
import { OwnedCreature, Position } from '../../types';
import { STAGES } from '../../data/stages';

function ownedAt(creatureId: string, level: number, idx = 0): OwnedCreature {
  return {
    instanceId: `t-${creatureId}-${idx}`,
    creatureId,
    level,
    xp: 0,
    acquiredAt: 0,
  };
}

function slot(o: OwnedCreature, position: Position, slot: number): TeamSlot {
  return { owned: o, position, slot };
}

describe('Rng', () => {
  it('is deterministic for same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next());
    }
  });
  it('produces values in [0,1)', () => {
    const r = new Rng(1);
    for (let i = 0; i < 100; i++) {
      const n = r.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('typeMultiplier', () => {
  it('predator is super-effective vs swift (catches the runner)', () => {
    expect(typeMultiplier('predator', 'swift').effectiveness).toBe('super');
    expect(typeMultiplier('predator', 'swift').multiplier).toBeCloseTo(1.5);
  });
  it('predator is weak vs cunning (outwitted)', () => {
    expect(typeMultiplier('predator', 'cunning').effectiveness).toBe('weak');
    expect(typeMultiplier('predator', 'cunning').multiplier).toBeCloseTo(0.67);
  });
  it('cunning beats predator and tough', () => {
    expect(typeMultiplier('cunning', 'predator').effectiveness).toBe('super');
    expect(typeMultiplier('cunning', 'tough').effectiveness).toBe('super');
  });
  it('social beats predator (numbers vs lone hunter)', () => {
    expect(typeMultiplier('social', 'predator').effectiveness).toBe('super');
  });
  it('tough beats wild (armor weathers chaos)', () => {
    expect(typeMultiplier('tough', 'wild').effectiveness).toBe('super');
  });
  it('wild beats swift (unpredictability breaks formations)', () => {
    expect(typeMultiplier('wild', 'swift').effectiveness).toBe('super');
  });
  it('normal-vs-anything is neutral', () => {
    expect(typeMultiplier('normal', 'predator').effectiveness).toBe('normal');
  });
});

describe('statsAtLevel', () => {
  it('returns base stats at level 1', () => {
    const def = CREATURES_BY_ID['tabby'];
    const stats = statsAtLevel(def, 1);
    expect(stats.hp).toBe(def.baseStats.hp);
  });
  it('scales up at higher levels and rarer growth', () => {
    const common = CREATURES_BY_ID['tabby'];
    const legendary = CREATURES_BY_ID['tiger'];
    const cAt10 = statsAtLevel(common, 10);
    const lAt10 = statsAtLevel(legendary, 10);
    expect(cAt10.hp).toBeGreaterThan(common.baseStats.hp);
    expect(lAt10.hp).toBeGreaterThan(legendary.baseStats.hp);
    const cGrowth = cAt10.hp / common.baseStats.hp;
    const lGrowth = lAt10.hp / legendary.baseStats.hp;
    expect(lGrowth).toBeGreaterThan(cGrowth);
  });
});

describe('computeDamage', () => {
  it('produces at least 1 damage and tags effectiveness', () => {
    // Predator vs Swift is super-effective.
    const a = makeBattleCreature(ownedAt('tabby', 5), 'player', 'front', 1);
    const b = makeBattleCreature(ownedAt('yapper', 5, 1), 'enemy', 'front', 1);
    const r = computeDamage(a, b, ABILITIES.pounce, new Rng(1));
    expect(r.damage).toBeGreaterThanOrEqual(1);
    expect(r.effectiveness).toBe('super');
  });
  it('zero-power abilities do zero damage', () => {
    const a = makeBattleCreature(ownedAt('pugling', 5), 'player', 'front', 1);
    const b = makeBattleCreature(ownedAt('sphynx', 5, 1), 'enemy', 'front', 1);
    const r = computeDamage(a, b, ABILITIES.brace, new Rng(1));
    expect(r.damage).toBe(0);
  });
});

describe('simulateBattle', () => {
  it('returns a winner and is deterministic for same seed', () => {
    const player = [
      slot(ownedAt('tiger', 10, 0), 'front', 1),
      slot(ownedAt('lion', 10, 1), 'front', 2),
    ];
    const enemy = [
      slot(ownedAt('sphynx', 5, 2), 'front', 1),
      slot(ownedAt('tabby', 5, 3), 'front', 2),
    ];
    const r1 = simulateBattle(player, enemy, 12345);
    const r2 = simulateBattle(player, enemy, 12345);
    expect(r1.winner).toBe(r2.winner);
    expect(r1.events.length).toBe(r2.events.length);
    expect(r1.turnsTaken).toBe(r2.turnsTaken);
  });

  it('higher-level player team should usually win', () => {
    const player = [
      slot(ownedAt('tiger', 15, 0), 'front', 1),
      slot(ownedAt('lion', 15, 1), 'front', 2),
      slot(ownedAt('direwolf', 15, 2), 'front', 3),
    ];
    const stage = STAGES[0];
    const enemy = buildEnemyTeam(stage);
    const result = simulateBattle(player, enemy, 1);
    expect(result.winner).toBe('player');
    expect(result.events.some((e) => e.kind === 'battle_end')).toBe(true);
  });

  it('back-row creatures cannot be hit until front is defeated', () => {
    const player = [
      slot(ownedAt('mastiff', 8), 'front', 1),
      slot(ownedAt('yapper', 8, 1), 'back', 4),
    ];
    const enemy = [
      slot(ownedAt('tabby', 5, 2), 'front', 1),
      slot(ownedAt('pup', 5, 3), 'front', 2),
    ];
    const result = simulateBattle(player, enemy, 7);

    for (const e of result.events) {
      if (e.kind === 'attack' && e.target === 't-yapper-1') {
        const tankHp = e.hpAfter?.['t-mastiff-0'];
        if (tankHp !== undefined && tankHp > 0) {
          throw new Error('Back row was hit while front row still alive');
        }
      }
    }
  });
});
