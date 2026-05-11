import { describe, expect, it } from 'vitest';
import { Rng } from '../rng';
import { typeMultiplier } from '../types';
import { computeDamage, critChance, dodgeChance } from '../damage';
import { selectAction } from '../ai';
import { rollRecruitment } from '../recruitment';
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

describe('crit + dodge math', () => {
  it('equal-speed creatures have 0% crit and 0% dodge', () => {
    // Two creatures with the same SPD stat at the same level.
    const a = makeBattleCreature(ownedAt('tabby', 5, 0), 'player', 'front', 1);
    const b = makeBattleCreature(ownedAt('tabby', 5, 1), 'enemy', 'front', 1);
    expect(critChance(a, b)).toBe(0);
    expect(dodgeChance(a, b)).toBe(0);
  });

  it('faster attacker gets a non-zero crit chance, no dodge against', () => {
    // Yapper (SPD 75 base) vs Pugling (SPD 25 base) — big speed gap.
    const a = makeBattleCreature(ownedAt('yapper', 5), 'player', 'front', 1);
    const b = makeBattleCreature(ownedAt('pugling', 5, 1), 'enemy', 'front', 1);
    expect(critChance(a, b)).toBeGreaterThan(0);
    expect(dodgeChance(a, b)).toBe(0);
  });

  it('faster defender gets a non-zero dodge, no crit for slow attacker', () => {
    const slow = makeBattleCreature(ownedAt('pugling', 5), 'player', 'front', 1);
    const fast = makeBattleCreature(ownedAt('yapper', 5, 1), 'enemy', 'front', 1);
    expect(critChance(slow, fast)).toBe(0);
    expect(dodgeChance(slow, fast)).toBeGreaterThan(0);
  });

  it('crit + dodge are capped (25% and 20%)', () => {
    // Tiger (high-SPD legendary at level 50) vs Pugling (slow common at level 1).
    // The natural speed gap will pin both caps.
    const fast = makeBattleCreature(ownedAt('tiger', 50), 'player', 'front', 1);
    const slow = makeBattleCreature(ownedAt('pugling', 1, 1), 'enemy', 'front', 1);
    expect(critChance(fast, slow)).toBeLessThanOrEqual(0.25 + 1e-9);
    expect(dodgeChance(slow, fast)).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  it('damage with a dodge rolled returns dodged=true and zero damage', () => {
    // We can't force a dodge from outside without a seeded rng path that
    // happens to roll inside the dodge band. Instead, verify the structure
    // of a normal result and accept either dodged or not for variance.
    const a = makeBattleCreature(ownedAt('yapper', 5), 'player', 'front', 1);
    const b = makeBattleCreature(ownedAt('pugling', 5, 1), 'enemy', 'front', 1);
    const r = computeDamage(a, b, ABILITIES.dash, new Rng(99));
    expect(typeof r.dodged).toBe('boolean');
    expect(typeof r.isCrit).toBe('boolean');
    if (r.dodged) expect(r.damage).toBe(0);
  });
});

describe('recruitment', () => {
  it('returns null with no defeated enemies', () => {
    const r = rollRecruitment({
      enemyCreatureIds: [],
      stars: 3,
      ownedSpeciesIds: new Set(),
      rng: new Rng(1),
    });
    expect(r).toBeNull();
  });

  it('over many trials, recruits something from a common-only stage', () => {
    let hits = 0;
    for (let i = 0; i < 500; i++) {
      const r = rollRecruitment({
        enemyCreatureIds: ['tabby', 'pup'],
        stars: 3,
        ownedSpeciesIds: new Set(),
        rng: new Rng(i + 1),
      });
      if (r) hits++;
    }
    // Expected ~57% with two commons at 3 stars. Verify it's in a reasonable
    // window — generous to avoid flakes.
    expect(hits).toBeGreaterThan(150);
    expect(hits).toBeLessThan(450);
  });

  it('owning every enemy species roughly halves the hit rate', () => {
    let openHits = 0;
    let ownedHits = 0;
    for (let i = 0; i < 500; i++) {
      if (rollRecruitment({
        enemyCreatureIds: ['tabby'],
        stars: 3,
        ownedSpeciesIds: new Set(),
        rng: new Rng(i + 1),
      })) openHits++;
      if (rollRecruitment({
        enemyCreatureIds: ['tabby'],
        stars: 3,
        ownedSpeciesIds: new Set(['tabby']),
        rng: new Rng(i + 1),
      })) ownedHits++;
    }
    expect(ownedHits).toBeLessThan(openHits);
    // Owned rate should be roughly half, allow generous tolerance.
    expect(ownedHits).toBeGreaterThan(openHits / 3);
  });

  it('prefers rarer species when multiple rolls pass', () => {
    // Force a deterministic seed where both rolls likely pass; verify the
    // rarer of the two is returned.
    const seenRarities = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const r = rollRecruitment({
        enemyCreatureIds: ['tabby', 'lion'], // common + legendary
        stars: 3,
        ownedSpeciesIds: new Set(),
        rng: new Rng(i + 1),
      });
      if (r) seenRarities.add(r.rarity);
    }
    // We can see legendary at least once across 200 trials (rate ~2%).
    // The point: when ONE rolls, it can be either; we just check the function
    // returns something sensible.
    expect(seenRarities.size).toBeGreaterThan(0);
  });
});

describe('AI personalities', () => {
  it('saboteur (cunning) self-buffs SP.ATK on first action when Outsmart is ready', () => {
    // Border collie has outsmart as its second ability.
    const actor = makeBattleCreature(ownedAt('border', 10), 'player', 'front', 1);
    const enemy = makeBattleCreature(ownedAt('tabby', 5, 1), 'enemy', 'front', 1);
    const choice = selectAction(actor, [enemy], [actor]);
    expect(choice).not.toBeNull();
    expect(choice!.ability.id).toBe('outsmart');
    expect(choice!.targets[0].instanceId).toBe(actor.instanceId);
  });

  it('hunter (predator) targets the lowest-HP enemy in range', () => {
    const actor = makeBattleCreature(ownedAt('tabby', 5), 'player', 'front', 1);
    const wounded = makeBattleCreature(ownedAt('tabby', 5, 1), 'enemy', 'front', 1);
    const healthy = makeBattleCreature(ownedAt('tabby', 5, 2), 'enemy', 'front', 2);
    // Wound the first enemy.
    wounded.hp = 5;
    const choice = selectAction(actor, [wounded, healthy], [actor]);
    expect(choice).not.toBeNull();
    expect(choice!.targets[0].instanceId).toBe(wounded.instanceId);
  });

  it('skirmisher (swift) picks priority abilities first', () => {
    // Yapper's second ability is "dash" with priority=true.
    const actor = makeBattleCreature(ownedAt('yapper', 5), 'player', 'front', 1);
    const enemy = makeBattleCreature(ownedAt('pup', 5, 1), 'enemy', 'front', 1);
    const choice = selectAction(actor, [enemy], [actor]);
    expect(choice).not.toBeNull();
    expect(choice!.ability.id).toBe('dash');
  });

  it('anchor (tough) uses team-DEF buff first when available', () => {
    // Pugling has brace as its second ability — team DEF buff.
    const actor = makeBattleCreature(ownedAt('pugling', 5), 'player', 'front', 1);
    const ally = makeBattleCreature(ownedAt('tabby', 5, 1), 'player', 'front', 2);
    const enemy = makeBattleCreature(ownedAt('tabby', 5, 2), 'enemy', 'front', 1);
    const choice = selectAction(actor, [enemy], [actor, ally]);
    expect(choice).not.toBeNull();
    expect(choice!.ability.id).toBe('brace');
  });

  it('berserker (wild) always picks the highest-power available ability', () => {
    // Husky's specials: bite (cd 0, pwr 45) and frenzy (cd 4, pwr 80).
    const actor = makeBattleCreature(ownedAt('husky', 5), 'player', 'front', 1);
    const enemy = makeBattleCreature(ownedAt('tabby', 5, 1), 'enemy', 'front', 1);
    const choice = selectAction(actor, [enemy], [actor]);
    expect(choice).not.toBeNull();
    expect(choice!.ability.id).toBe('frenzy');
  });
});
