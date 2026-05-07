# Creature Clash — Project Notes

Auto-battler mobile game (Expo Router + TypeScript). See
`CREATURE_CLASH_HANDOFF.md` for the full design doc.

## Layout

- `app/` — Expo project root (`cd app` for any expo / npm command)
  - `app/` — Expo Router screens (`(tabs)/index.tsx` home, `(tabs)/battle.tsx`
    stage select, `(tabs)/creatures.tsx` collection + team builder,
    `battle/[stageId].tsx` active battle)
  - `src/engine/` — pure battle logic (no UI imports). Deterministic with
    seeded `Rng`. `simulateBattle()` returns the full event log; the UI plays
    it back.
  - `src/data/` — creatures, abilities, stages
  - `src/stores/playerStore.ts` — Zustand store, persisted via AsyncStorage
  - `src/components/` — UI building blocks
  - `src/types/index.ts` — shared types

## Dev

```bash
cd app
npm start          # expo dev server
npm run ios        # iOS simulator
npm test           # vitest engine tests
npm run typecheck  # tsc --noEmit
```

## Phase status (vs handoff)

- **Phase 1 (Core Loop): DONE** — engine, data, team builder, stage select,
  battle screen with playback, rewards, persistence, 12 engine tests passing.
- Phase 2 (Supabase + gacha + cloud save): not started
- Phase 3 (RevenueCat IAP + real pixel art + audio): not started

## Conventions

- Sprites are placeholder colored squares with the creature's first letter.
  Real pixel art swap-in is Phase 3 — keep `CreatureSprite` API stable.
- Battle determinism: `simulateBattle(playerSlots, enemySlots, seed)` must
  return the same `BattleResult` for the same seed. Don't introduce
  `Math.random()` in `src/engine/`; use the passed `Rng`.
- Player starter inventory is granted in `playerStore`'s `onRehydrateStorage`
  when `ownedCreatures.length === 0`.
