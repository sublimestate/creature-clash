# Creature Clash

Auto-battler mobile game built with Expo Router + TypeScript. Cats vs dogs in
the neighborhood; later chapters will introduce other species.

Repo: https://github.com/sublimestate/creature-clash (private)

## Stack

- **Framework**: React Native + Expo SDK 54, Expo Router (file-based routes),
  Reanimated 4, TypeScript
- **State**: Zustand 4.x persisted via AsyncStorage (web → localStorage)
- **Tests**: Vitest (engine only — no RN runtime needed)
- **Bundler**: Metro. `metro.config.js` disables `unstable_enablePackageExports`
  so packages with `import.meta.env` in their ESM build (Zustand, others) fall
  back to their CJS entry — Hermes can't parse `import.meta`, so without this
  the web bundle silently fails to hydrate. **Don't remove that flag.**

## Run / test / build

```bash
cd app                      # all commands run from here
npm start                   # expo dev server
npm run web -- --clear      # web (use --clear after route changes)
npm run ios                 # iOS simulator (needs Xcode)
npm test                    # vitest engine tests (16 currently pass)
npm run typecheck           # tsc --noEmit
```

If you add or rename a route, run `expo start` once so it regenerates
`.expo/types/router.d.ts`. The typed-router error message looks like
`Argument of type '/foo' is not assignable to ...` — that's stale types,
not a real bug.

## Project structure

```
app/
├── app/                      # Expo Router file-based routes
│   ├── _layout.tsx           # root stack: tabs + intro/preview/battle modals
│   ├── (tabs)/
│   │   ├── _layout.tsx       # tab bar (Home, Battle, Pets); headers hidden
│   │   ├── index.tsx         # home — showcase, stats, "Continue Adventure",
│   │   │                     #   field notes, Start New Game (2-step confirm)
│   │   ├── battle.tsx        # campaign / stage select, grouped by chapter
│   │   └── creatures.tsx     # team builder + pet collection + detail panel
│   ├── intro/[chapter].tsx   # animated chapter intro (lines fade in
│   │                         #   sequentially, then "Begin" appears)
│   ├── preview/[stageId].tsx # pre-battle team-vs-team matchup screen
│   ├── battle/[stageId].tsx  # active battle playback (animated)
│   └── +not-found.tsx
├── src/
│   ├── engine/               # PURE LOGIC — no UI imports
│   │   ├── battle.ts         # simulateBattle() — returns BattleEvent[]
│   │   ├── damage.ts         # damage formula
│   │   ├── ai.ts             # target / ability selection
│   │   ├── types.ts          # 6-role chart (predator/swift/tough/cunning/
│   │   │                     #   social/wild) + TYPE_COLORS
│   │   ├── stats.ts          # stat scaling per level + rarity
│   │   ├── rng.ts            # Mulberry32 deterministic PRNG
│   │   ├── buffs.ts          # effective-stat + buff tick
│   │   └── __tests__/        # vitest engine tests
│   ├── data/
│   │   ├── creatures.ts      # 20 cats/dogs with stats + abilities
│   │   ├── abilities.ts      # ~24 role-themed abilities
│   │   ├── stages.ts         # 10 campaign stages, 2 chapters
│   │   ├── chapters.ts       # chapter title + intro story beats
│   │   └── pixelSprites.ts   # 16×16 hand-drawn templates + per-creature
│   │                         #   palettes (validated at module load)
│   ├── stores/
│   │   └── playerStore.ts    # zustand persist, version 2, with migrate
│   ├── components/
│   │   ├── battle/           # BattleUnit, HealthBar, DamageNumber
│   │   ├── creatures/        # CreatureCard
│   │   └── common/           # CreatureSprite, PixelSprite, CurrencyHeader,
│   │                         #   RarityBadge
│   ├── types/index.ts        # shared types (CreatureType, BattleEvent, etc.)
│   └── theme.ts              # COLORS + RARITY_COLORS
├── app.json                  # web.output: "static" — DON'T set "single"
├── metro.config.js           # disables package-exports (see Stack notes)
├── vitest.config.ts
└── package.json
```

## Core design

### Battle engine

`simulateBattle(playerSlots, enemySlots, seed)` returns a `BattleResult`
containing `events: BattleEvent[]`. The UI plays the event list back at
configurable speed; it does **not** re-run the engine.

**Determinism is a hard invariant.** Same teams + same seed must produce the
same result every time. Never introduce `Math.random()` in `src/engine/`;
always use the passed `Rng`. Tests rely on this.

Each event optionally carries `hpAfter`, `statusesAfter`, `cooldownsAfter`
snapshots so playback stays in sync without engine reentry. The `push` helper
inside `simulateBattle` attaches all three automatically.

### Type chart (6-role rock-paper-scissors)

Each role beats 2, weak to 2:

```
Predator > Swift, Wild     | weak to Cunning, Social
Swift    > Tough, Cunning  | weak to Predator, Wild
Tough    > Wild, Social    | weak to Swift, Cunning
Cunning  > Predator, Tough | weak to Swift, Social
Social   > Predator, Cunning | weak to Tough, Wild
Wild     > Social, Swift   | weak to Predator, Tough
```

Super-effective = 1.5×, weak = 0.67×.

### Pixel sprites

`src/data/pixelSprites.ts` defines 7 templates (cat / catSlim / bigCat /
dogPerked / dogFloppy / dogStocky / wolf), each a 16×16 grid of palette-index
chars. Each row is validated to be exactly 16 chars at module load. Each
creature picks a template + a 9-color palette. `<PixelSprite>` renders the
grid as a 16×16 grid of `<View>` cells.

To add a new template, add 16 rows of exactly 16 chars (`'.'` = transparent,
`'0'-'8'` = palette index). The validator throws on mismatch.

### Save / persistence

Zustand persist key `creature-clash-player`, version `2`. Bump version + extend
the `migrate` callback whenever you change the persisted schema or rename a
creature ID. The migrate function returns a wiped state; the rehydrate hook
then grants a fresh starter pack via `buildStarterInventory`.

Starter pack: one of each role at level 3, 200 gold, 500 gems.

`resetAll()` is exposed on the store and wired to the home-screen "Start New
Game" button (two-tap confirm).

### Navigation flow

```
Home tab "Continue Adventure" → /battle (stage list)
Tap stage → if first-of-chapter and unread intro: /intro/[chapter] → /preview/[stageId]
            else: /preview/[stageId]
Preview "FIGHT" → /battle/[stageId]
Battle end → "Continue" replaces with /battle (tab); "Retry" replaces with /preview
```

Stage unlock: a stage is unlocked iff the previous one in `STAGES[]` order is
in `completedStages`.

## What's done

- **Phase 1 core loop**: engine, 20 creatures, 24 abilities, 10 stages, team
  builder, deterministic battle with animated playback (sprite lunge / hit
  shake / damage numbers / status icons / cooldown badges / type-keyed flash)
- **Theme**: cats/dogs roster with role-based combat, narrative stage names
- **Pre-battle preview** with team-vs-team matchup highlights
- **Procedural pixel sprites** (16×16) for all 20 creatures
- **Chapter intros** with sequential line fade-in (Ch.1 cozy, Ch.2 first edge)
- **Save migration v1→v2** with two-tap "Start New Game" reset
- **16 engine tests** passing; web bundle exports clean

## Not yet done

- AI personalities + crits/dodges (battles too uniform)
- Audio (SFX + BGM via `expo-av`)
- Level-up feedback flow (XP awarded but no visual feedback)
- Supabase auth + cloud save
- Gacha system (intentionally deferred per user)
- Real higher-fidelity pixel art (32×32 PNGs would drop into `<CreatureSprite>`
  alongside the procedural fallback)
- More chapters / stages / species (rooftop birds, sewer reptiles)
- iOS / Android EAS build, App Store assets

## Conventions

- **No comments that re-state code.** Only when *why* is non-obvious.
- **No emojis** in source files unless explicitly requested.
- **Don't push to GitHub** without explicit user permission. Repo is private.
- Tab bar headers are hidden — each screen renders its own header with a
  custom title and `CurrencyHeader`. Don't re-enable the default Tabs header.
- Keep `<CreatureSprite>` API stable: `creatureId`, `type`, `size`, `fainted`,
  `flip`. Higher-fidelity art will swap in inside this component.
- `web.output` in `app.json` MUST be `"static"`. Single-page (`"single"`)
  works but skips SSR entirely; we want the static-export pipeline ready
  for shipping.
