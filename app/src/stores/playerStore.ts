import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CREATURES } from '../data/creatures';
import { OwnedCreature, Position } from '../types';
import { xpForLevel } from '../engine/stats';

export interface TeamSlotState {
  instanceId: string | null;
  position: Position;
  slot: number;
}

interface PlayerState {
  hydrated: boolean;
  displayName: string;
  gold: number;
  gems: number;
  ownedCreatures: OwnedCreature[];
  team: TeamSlotState[];
  completedStages: Record<string, { stars: number }>;
  seenChapterIntros: Record<number, boolean>;
  setName: (name: string) => void;
  addGold: (n: number) => void;
  addGems: (n: number) => void;
  spendGems: (n: number) => boolean;
  addCreature: (creatureId: string, level?: number) => OwnedCreature;
  removeCreature: (instanceId: string) => void;
  assignToSlot: (slot: number, instanceId: string | null) => void;
  swapSlots: (a: number, b: number) => void;
  awardXp: (instanceIds: string[], amountPerCreature: number) => OwnedCreature[];
  recordStage: (stageId: string, stars: number) => void;
  markChapterIntroSeen: (chapter: number) => void;
  resetAll: () => void;
}

const DEFAULT_TEAM: TeamSlotState[] = [
  { instanceId: null, position: 'front', slot: 1 },
  { instanceId: null, position: 'front', slot: 2 },
  { instanceId: null, position: 'front', slot: 3 },
  { instanceId: null, position: 'back', slot: 4 },
  { instanceId: null, position: 'back', slot: 5 },
];

let instanceCounter = 1;
function newInstanceId(): string {
  return `c${Date.now().toString(36)}${(instanceCounter++).toString(36)}`;
}

// Starter pack — one of each role so the new player can experiment with the
// matchup chart from day one.
const STARTER_IDS = ['tabby', 'pup', 'yapper', 'pugling', 'sphynx', 'mutt'];

function buildStarterInventory(): { owned: OwnedCreature[]; team: TeamSlotState[] } {
  const owned: OwnedCreature[] = STARTER_IDS.map((cid) => ({
    instanceId: newInstanceId(),
    creatureId: cid,
    level: 3,
    xp: 0,
    acquiredAt: Date.now(),
  }));
  // First 3 -> front, next 2 -> back
  const team: TeamSlotState[] = DEFAULT_TEAM.map((s, i) => ({
    ...s,
    instanceId: owned[i]?.instanceId ?? null,
  }));
  return { owned, team };
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      displayName: 'Trainer',
      gold: 200,
      gems: 500,
      ownedCreatures: [],
      team: DEFAULT_TEAM,
      completedStages: {},
      seenChapterIntros: {},

      setName: (name) => set({ displayName: name }),
      addGold: (n) => set((s) => ({ gold: s.gold + n })),
      addGems: (n) => set((s) => ({ gems: s.gems + n })),
      spendGems: (n) => {
        if (get().gems < n) return false;
        set((s) => ({ gems: s.gems - n }));
        return true;
      },

      addCreature: (creatureId, level = 1) => {
        const owned: OwnedCreature = {
          instanceId: newInstanceId(),
          creatureId,
          level,
          xp: 0,
          acquiredAt: Date.now(),
        };
        set((s) => ({ ownedCreatures: [...s.ownedCreatures, owned] }));
        return owned;
      },

      removeCreature: (instanceId) => {
        set((s) => ({
          ownedCreatures: s.ownedCreatures.filter((c) => c.instanceId !== instanceId),
          team: s.team.map((t) =>
            t.instanceId === instanceId ? { ...t, instanceId: null } : t,
          ),
        }));
      },

      assignToSlot: (slot, instanceId) => {
        set((s) => ({
          team: s.team.map((t) => {
            if (t.slot === slot) return { ...t, instanceId };
            // Prevent the same creature in two slots
            if (instanceId && t.instanceId === instanceId)
              return { ...t, instanceId: null };
            return t;
          }),
        }));
      },

      swapSlots: (a, b) => {
        set((s) => {
          const slotA = s.team.find((t) => t.slot === a);
          const slotB = s.team.find((t) => t.slot === b);
          if (!slotA || !slotB) return {};
          return {
            team: s.team.map((t) => {
              if (t.slot === a) return { ...t, instanceId: slotB.instanceId };
              if (t.slot === b) return { ...t, instanceId: slotA.instanceId };
              return t;
            }),
          };
        });
      },

      awardXp: (instanceIds, amountPerCreature) => {
        const leveled: OwnedCreature[] = [];
        set((s) => ({
          ownedCreatures: s.ownedCreatures.map((c) => {
            if (!instanceIds.includes(c.instanceId)) return c;
            let level = c.level;
            let xp = c.xp + amountPerCreature;
            let neededXp = xpForLevel(level);
            while (xp >= neededXp && level < 50) {
              xp -= neededXp;
              level += 1;
              neededXp = xpForLevel(level);
            }
            const updated = { ...c, level, xp };
            if (level > c.level) leveled.push(updated);
            return updated;
          }),
        }));
        return leveled;
      },

      recordStage: (stageId, stars) => {
        set((s) => {
          const prev = s.completedStages[stageId]?.stars ?? 0;
          if (stars <= prev) return {};
          return { completedStages: { ...s.completedStages, [stageId]: { stars } } };
        });
      },

      markChapterIntroSeen: (chapter) => {
        set((s) => {
          if (s.seenChapterIntros[chapter]) return {};
          return {
            seenChapterIntros: { ...s.seenChapterIntros, [chapter]: true },
          };
        });
      },

      resetAll: () => {
        const { owned, team } = buildStarterInventory();
        set({
          gold: 200,
          gems: 500,
          ownedCreatures: owned,
          team,
          completedStages: {},
          seenChapterIntros: {},
        });
      },
    }),
    {
      name: 'creature-clash-player',
      // Bump on any breaking schema or roster change. v2: cats+dogs roster.
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Older saves reference creature IDs that no longer exist. Wipe the
      // inventory and team; let the rehydrate hook below grant a fresh starter.
      migrate: (_persistedState, _version) => ({
        displayName: 'Trainer',
        gold: 200,
        gems: 500,
        ownedCreatures: [],
        team: DEFAULT_TEAM,
        completedStages: {},
        seenChapterIntros: {},
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.ownedCreatures.length === 0) {
            const { owned, team } = buildStarterInventory();
            state.ownedCreatures = owned;
            state.team = team;
          }
          state.hydrated = true;
        }
      },
    },
  ),
);

// Helpers
export function getOwnedById(instanceId: string | null): OwnedCreature | undefined {
  if (!instanceId) return undefined;
  return usePlayerStore.getState().ownedCreatures.find((c) => c.instanceId === instanceId);
}

export function buildTeamSlots() {
  const s = usePlayerStore.getState();
  return s.team
    .filter((t) => t.instanceId !== null)
    .map((t) => {
      const owned = s.ownedCreatures.find((c) => c.instanceId === t.instanceId);
      if (!owned) return null;
      return { owned, position: t.position, slot: t.slot };
    })
    .filter((x): x is { owned: OwnedCreature; position: Position; slot: number } => !!x);
}

export const RARITY_FOR_ID: Record<string, string> = Object.fromEntries(
  CREATURES.map((c) => [c.id, c.rarity]),
);
