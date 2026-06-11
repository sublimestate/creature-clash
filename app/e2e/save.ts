import type { Page } from '@playwright/test';

// Builds a save in the exact shape zustand-persist writes to AsyncStorage
// (localStorage on web) and injects it before the app loads, so tests can
// start from any game state without clicking through onboarding.
//
// Keep STORAGE_VERSION in sync with the `version` in playerStore.ts — a
// mismatch makes the store's migrate() wipe the seeded save and the test
// lands on onboarding instead.

const STORAGE_KEY = 'creature-clash-player';
const STORAGE_VERSION = 2;

export interface SeedCreature {
  instanceId: string;
  creatureId: string;
  level: number;
}

export interface SaveOptions {
  displayName?: string;
  gold?: number;
  gems?: number;
  completedStages?: Record<string, { stars: number }>;
  seenChapterIntros?: Record<number, boolean>;
  hasSeenOutro?: boolean;
}

const TEAM_LAYOUT: Array<{ position: 'front' | 'back'; slot: number }> = [
  { position: 'front', slot: 1 },
  { position: 'front', slot: 2 },
  { position: 'front', slot: 3 },
  { position: 'back', slot: 4 },
  { position: 'back', slot: 5 },
];

export function buildSave(creatures: SeedCreature[], opts: SaveOptions = {}): string {
  const state = {
    hydrated: false,
    displayName: opts.displayName ?? 'E2E Tester',
    gold: opts.gold ?? 200,
    gems: opts.gems ?? 500,
    ownedCreatures: creatures.map((c) => ({
      instanceId: c.instanceId,
      creatureId: c.creatureId,
      level: c.level,
      xp: 0,
      acquiredAt: 0,
    })),
    team: TEAM_LAYOUT.map((t, i) => ({
      ...t,
      instanceId: creatures[i]?.instanceId ?? null,
    })),
    completedStages: opts.completedStages ?? {},
    // Skip chapter-intro story screens by default so stage taps go straight
    // to the preview. Pass {} to exercise the intro flow.
    seenChapterIntros: opts.seenChapterIntros ?? { 1: true, 2: true, 3: true },
    hasSelectedStarter: true,
    hasSeenOutro: opts.hasSeenOutro ?? false,
    metCreatures: {},
  };
  return JSON.stringify({ state, version: STORAGE_VERSION });
}

export async function seedSave(page: Page, save: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, save] as const,
  );
}

// Battle outcomes are seeded from Date.now(), so E2E tests can't pin a seed.
// A team this overleveled relative to chapter 1 (enemy levels 1-5) wins
// every roll in practice, which is what keeps these tests stable.
export const STRONG_TEAM: SeedCreature[] = [
  { instanceId: 'e2e-1', creatureId: 'tabby', level: 20 },
  { instanceId: 'e2e-2', creatureId: 'pugling', level: 20 },
  { instanceId: 'e2e-3', creatureId: 'pup', level: 20 },
];
