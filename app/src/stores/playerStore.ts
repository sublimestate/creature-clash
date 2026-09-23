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
  hasSelectedStarter: boolean;
  hasSeenOutro: boolean;
  metCreatures: Record<string, { firstSeenStageId: string }>;
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
  markOutroSeen: () => void;
  selectStarters: (picks: Array<{ creatureId: string; nickname?: string }>) => void;
  setNickname: (instanceId: string, nickname: string) => void;
  markCreaturesMet: (creatureIds: string[], stageId: string) => void;
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

const STARTER_LEVEL = 3;

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
      hasSelectedStarter: false,
      hasSeenOutro: false,
      metCreatures: {},

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
        set((s) => {
          const nextOwned = [...s.ownedCreatures, owned];
          let nextTeam = s.team;
          
          const emptyIndex = s.team.findIndex((t) => t.instanceId === null);
          if (emptyIndex !== -1) {
            nextTeam = [...s.team];
            nextTeam[emptyIndex] = { ...nextTeam[emptyIndex], instanceId: owned.instanceId };
          }
          
          return { ownedCreatures: nextOwned, team: nextTeam };
        });
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

      markOutroSeen: () => {
        set((s) => (s.hasSeenOutro ? {} : { hasSeenOutro: true }));
      },

      selectStarters: (picks) => {
        const owned: OwnedCreature[] = picks.map((p) => ({
          instanceId: newInstanceId(),
          creatureId: p.creatureId,
          level: STARTER_LEVEL,
          xp: 0,
          acquiredAt: Date.now(),
          nickname: p.nickname?.trim() || undefined,
        }));
        const team: TeamSlotState[] = DEFAULT_TEAM.map((s, i) => ({
          ...s,
          instanceId: owned[i]?.instanceId ?? null,
        }));
        set({
          ownedCreatures: owned,
          team,
          hasSelectedStarter: true,
        });
      },

      setNickname: (instanceId, nickname) => {
        const trimmed = nickname.trim();
        set((s) => ({
          ownedCreatures: s.ownedCreatures.map((c) =>
            c.instanceId === instanceId
              ? { ...c, nickname: trimmed || undefined }
              : c,
          ),
        }));
      },

      markCreaturesMet: (creatureIds, stageId) => {
        set((s) => {
          const next = { ...s.metCreatures };
          let changed = false;
          for (const id of creatureIds) {
            if (!next[id]) {
              next[id] = { firstSeenStageId: stageId };
              changed = true;
            }
          }
          return changed ? { metCreatures: next } : {};
        });
      },

      resetAll: () => {
        set({
          displayName: 'Trainer',
          gold: 200,
          gems: 500,
          ownedCreatures: [],
          team: DEFAULT_TEAM,
          completedStages: {},
          seenChapterIntros: {},
          hasSelectedStarter: false,
          hasSeenOutro: false,
          metCreatures: {},
        });
      },
    }),
    {
      name: 'creature-clash-player',
      // Bump on any breaking schema or roster change. v2: cats+dogs roster.
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Older saves reference creature IDs that no longer exist. Wipe the
      // inventory and team; the layout guard then routes to onboarding.
      migrate: (_persistedState, _version) => ({
        displayName: 'Trainer',
        gold: 200,
        gems: 500,
        ownedCreatures: [],
        team: DEFAULT_TEAM,
        completedStages: {},
        seenChapterIntros: {},
        hasSelectedStarter: false,
        hasSeenOutro: false,
        metCreatures: {},
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Legacy migration: a save from before starter-selection existed
          // (v1) already has ownedCreatures populated. Mark them as
          // already-selected so they're not forced through the picker.
          if (state.ownedCreatures.length > 0 && !state.hasSelectedStarter) {
            state.hasSelectedStarter = true;
          }
          state.hydrated = true;
        }
      },
    },
  ),
);

// Helpers

// What to display for a creature: nickname if set, else species name. Pass
// nothing to fall back to the species (used when only the species id is
// known, e.g. enemy units).
export function displayNameFor(
  owned: OwnedCreature | undefined,
  speciesName: string,
): string {
  return owned?.nickname?.trim() || speciesName;
}

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
