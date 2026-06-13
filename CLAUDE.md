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
npm test                    # vitest engine tests (~30 currently pass)
npm run test:e2e            # playwright E2E (auto-starts expo web server)
npm run test:e2e:headed     # same, with a visible browser
npm run typecheck           # tsc --noEmit
```

If you add or rename a route, run `expo start` once so it regenerates
`.expo/types/router.d.ts`. The typed-router error message looks like
`Argument of type '/foo' is not assignable to ...` — that's stale types,
not a real bug.

To see `console.log` output from any test (sprite dumps, balance simulator),
run `npx vitest run --reporter=verbose <path>`. Plain `npm test` swallows it.

### E2E tests (Playwright)

`app/e2e/` drives the real web app in headless Chromium: onboarding flow,
a single stage win (rewards + unlock), and a full chapter 1 playthrough.
`e2e/save.ts` builds a save in zustand-persist's localStorage format and
injects it pre-load, so tests start from any game state — keep its
`STORAGE_VERSION` in sync with `playerStore.ts` or seeded saves get wiped
by `migrate()`. Battle outcomes seed from `Date.now()` and can't be pinned,
so battle tests use an overleveled team (`STRONG_TEAM`, level 20 vs chapter 1)
to make victory effectively certain. Locator gotchas encoded in the specs:
`getByText` needs `exact: true` where the battle log echoes banner words,
and expo-router keeps replaced screens mounted (hidden) in the DOM — use the
`onScreen()` helper after any `router.replace()` navigation. On failure,
inspect with `npx playwright show-trace test-results/<test>/trace.zip`.

## Project structure

```
app/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # root stack: tabs + intro/preview/battle/
│   │                             #   onboarding/outro modals
│   ├── +html.tsx                 # web HTML shell — global CSS (load-bearing!)
│   ├── (tabs)/
│   │   ├── _layout.tsx           # tab bar (Home, Battle, Pets); gates new
│   │   │                         #   players to /onboarding/select-starter
│   │   ├── index.tsx             # home — showcase, stats, "Continue Adventure",
│   │   │                         #   field notes, Start New Game (2-step confirm)
│   │   ├── battle.tsx            # campaign / stage select, grouped by chapter
│   │   └── creatures.tsx         # team builder + pet collection + Field Journal
│   ├── onboarding/
│   │   └── select-starter.tsx    # 3-step: trainer name → pick 2 of 5 → nickname
│   ├── intro/[chapter].tsx       # animated chapter intro (sequential fade-in)
│   ├── preview/[stageId].tsx     # pre-battle team-vs-team matchup + boss taunt
│   ├── battle/[stageId].tsx      # active battle playback (animated)
│   ├── outro/index.tsx           # plays once after the final boss
│   └── +not-found.tsx
├── src/
│   ├── engine/                   # PURE LOGIC — no UI imports
│   │   ├── battle.ts             # simulateBattle() — returns BattleEvent[]
│   │   ├── damage.ts             # damage formula + crit/dodge on SPD diff
│   │   ├── ai.ts                 # 6 role-specific personality policies
│   │   ├── types.ts              # 6-role chart + TYPE_COLORS
│   │   ├── stats.ts              # stat scaling per level + XP curve
│   │   ├── rng.ts                # Mulberry32 deterministic PRNG
│   │   ├── buffs.ts              # effective-stat + buff tick
│   │   ├── recruitment.ts        # post-victory recruit roll (rarity-tiered)
│   │   └── __tests__/            # engine.test.ts (assertions) +
│   │                             #   balance.test.ts (diagnostic only)
│   ├── audio/                    # runtime Web Audio synth (no binary assets)
│   │   ├── synth.ts              # AudioContext, tone/noise primitives, mute state
│   │   ├── sfx.ts                # named SFX recipes (hit/crit/heal/victory/...)
│   │   ├── bgm.ts                # chiptune step sequencer (theme + battle tracks)
│   │   └── index.ts              # public API: playSfx/playBgm/initAudio/unlockAudio
│   ├── data/
│   │   ├── creatures.ts          # 24 pets (cats/dogs/birds) with stats
│   │   ├── abilities.ts          # ~24 role-themed abilities
│   │   ├── stages.ts             # 15 campaign stages, 3 chapters
│   │   ├── chapters.ts           # chapter title + intro story beats (Ch1-3)
│   │   ├── bosses.ts             # boss personas keyed by stageId (taunt +
│   │   │                         #   victory line, currently c1s5/c2s5/c3s5)
│   │   ├── starterCandidates.ts  # 5 commons offered in onboarding
│   │   ├── spriteGenerator.ts    # procedural 32×32 sprite primitives + composers
│   │   └── pixelSprites.ts       # TEMPLATES (32×32 generated + legacy 16×16) +
│   │                             #   per-creature SPRITES (template + palette)
│   ├── stores/
│   │   └── playerStore.ts        # zustand persist, version 2, with migrate
│   ├── components/
│   │   ├── battle/               # BattleUnit, HealthBar, DamageNumber
│   │   ├── creatures/            # CreatureCard, FieldJournal (encyclopedia)
│   │   └── common/               # CreatureSprite, PixelSprite, CurrencyHeader,
│   │                             #   RarityBadge, MuteButton
│   ├── types/index.ts            # shared types (CreatureType, BattleEvent, etc.)
│   └── theme.ts                  # COLORS + RARITY_COLORS
├── e2e/                          # Playwright browser tests + save-seeding helper
├── app.json                      # web.output: "static" — DON'T set "single"
├── metro.config.js               # disables package-exports (see Stack notes)
├── playwright.config.ts          # auto-starts expo web server on :8081
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

`src/data/spriteGenerator.ts` sculpts each 32×32 sprite from a compact
`AnimalSpec` (species/build/ears/tail/mane/pattern). The look comes from
three layers, in order:
1. **Shaded masses** — `shadeEllipse` fills the body/head and lights each
   pixel from the upper-left by treating its position as a surface normal,
   so masses read as volumes, not flat blobs. Don't fill bodies with a flat
   ellipse; that's what made the old sprites look unrefined.
2. **Markings** — `applyPattern` stamps species identity (tabby/tiger
   stripes, spots, mask, patch, speckle) over body pixels only. This is what
   distinguishes same-template creatures (tiger vs lion, bengal vs tabby);
   colour swaps alone are not enough.
3. **Outline** — `drawOutline` wraps the silhouette in a 1px darkest ring
   placed in the transparent cells *outside* the body, so the body keeps its
   full mass (crisper than eroding the edge inward).

`src/data/pixelSprites.ts` holds one `build({...spec, body, eye, pattern…})`
per creature. The palette ramp (mid/shadow/highlight/outline) is **derived**
from a single `body` hex via `lighten`/`darken`, so creatures read by shape
*and* colour. Palette is a 12-entry index array (legend at the top of both
files); row chars are `.`=transparent, `0`-`9` and `a`-`f` for indices 0-15.
`tmpl()` validates dimensions/charset at module load. Determinism holds —
markings use a seeded `mulberry` PRNG, never `Math.random()`.

`<PixelSprite>` reads `data.template` (a `{grid, rows}` object) directly and
renders each cell as a View. **Preview while iterating:** `npm run
sprites:preview -- /tmp/out.png` renders every creature into one labelled
PNG montage (via `scripts/renderSprites.ts` + a hand-rolled PNG encoder in
`scripts/png.ts`) — the only way to actually see sprite changes without
launching the app.

### Audio

`src/audio/` synthesizes everything at runtime with the Web Audio API — the
audio analog of the procedural sprites; there are no sound files. SFX are
per-event recipes (`sfxForEvent` in the battle screen maps BattleEvent kinds
to sounds); BGM is a step sequencer with two looping tracks (`theme` for
home/campaign, `battle` in-fight) plus victory/defeat jingles as SFX.

Rules of the road:
- **Web-only by design.** Every entry point no-ops on native and in
  non-AudioContext browsers; call audio functions unconditionally, never
  guard at call sites. A future native pass swaps internals for expo-audio
  behind the same `src/audio` API.
- Browser autoplay policy keeps the context suspended until a user gesture;
  the root layout's pointerdown/keydown listener calls `unlockAudio()`,
  which resumes and starts any BGM requested while locked. Don't expect
  sound before the first click.
- Mute is persisted under its own AsyncStorage key
  (`creature-clash-audio`), deliberately NOT in the player save schema —
  no store version bump needed.
- `Math.random()` in `src/audio/` is fine (noise buffer); the determinism
  rule applies to `src/engine/` only.

### Save / persistence

Zustand persist key `creature-clash-player`, version `2`. Bump version + extend
the `migrate` callback whenever you change the persisted schema or rename a
creature ID. The migrate function wipes data; the rehydrate hook adopts
legacy saves by marking `hasSelectedStarter = true` if they already have
creatures.

Persisted fields beyond the obvious: `hasSelectedStarter` (gates onboarding
redirect), `hasSeenOutro` (gates final-boss outro), `seenChapterIntros`
(gates chapter intros), `metCreatures` (drives Field Journal silhouettes).

Starter flow: new players are redirected to `/onboarding/select-starter`
(picks 2 of 5 commons + sets trainer name + nicknames). After `selectStarters`,
they have 2 pets at level 3, 200 gold, 500 gems.

`resetAll()` clears everything (including `hasSelectedStarter`) and is wired
to the home-screen "Start New Game" button (two-tap confirm).

### Navigation flow

```
First launch / reset       → /onboarding/select-starter (tabs layout gates)
Home "Continue Adventure"  → /battle (stage list)
Tap stage → if first-of-chapter and unread intro: /intro/[chapter] → /preview/[stageId]
            else: /preview/[stageId]
Preview "FIGHT"            → /battle/[stageId]
Battle end (normal stage)  → "Continue" → /battle ; "Retry" → /preview
Battle end (final boss,    → "Continue" → /outro (once), then /battle
  first clear)
```

Stage unlock: a stage is unlocked iff the previous one in `STAGES[]` order is
in `completedStages`.

## What's done

- **Engine**: deterministic battle, 6-role chart, 24 abilities, 6 AI
  personalities (Hunter/Skirmisher/Anchor/Saboteur/Supporter/Berserker),
  crit + dodge on SPD differential, animated playback
- **Roster**: 24 creatures across cats, dogs, and birds; rarity tiers
  common → legendary
- **Content**: 15 stages across 3 chapters with chapter intros, named
  boss personas (taunt + victory line) for c1s5/c2s5/c3s5, outro
- **Onboarding**: 3-step flow (name → pick 2 of 5 → nickname). Layout
  guard redirects new players until starter is selected.
- **Reward loop**: post-victory level-up beats with HP/ATK deltas,
  recruitment rolls from defeated enemies (rarer = lower drop rate),
  Field Journal encyclopedia with met-tracking + filter chips
- **Sprites**: procedural 32×32 full-body sprites for every creature —
  directional form shading, derived colour ramps, species markings
  (stripes/spots/masks/patches), and a 1px outline pass
- **Audio**: procedurally synthesized SFX (15 named sounds) + chiptune BGM
  (theme/battle loops), mute toggle on home + battle headers (web only)
- **Web**: clean static export; tested only on web
- **Balance simulator**: `src/engine/__tests__/balance.test.ts` is
  informational, never fails. Simulates each stage 100× across player
  progression scenarios and logs win-rate tables to console.

## Not yet done

- Native audio — the Web Audio synth no-ops on iOS/Android; needs an
  expo-audio (or similar) backend behind the same `src/audio` API
- Supabase auth + cloud save
- Gacha system (intentionally deferred per user)
- Higher-fidelity hand-drawn pixel art (the procedural sprites are a
  baseline; PNGs could drop in alongside via `<CreatureSprite>`)
- Chapter 4+ (the outro hints at the Riverbed and reptiles)
- iOS / Android EAS build, App Store assets — native targets untested

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

## Web quirks

- **Web is the only tested target.** Native iOS/Android builds haven't
  been exercised. Most architecture decisions assume web; flag native
  portability concerns before changing renderer or persistence layers.
- **`app/+html.tsx` is load-bearing.** Its global CSS disables
  `user-select` on `[role="button"]`/`[role="tab"]`/`[role="link"]`,
  which prevents Pressables from selecting their inner Text on tap
  instead of firing `onPress`. Removing it silently breaks every button.
