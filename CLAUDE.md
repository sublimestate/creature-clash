# Creature Clash

Auto-battler mobile game built with Expo Router + TypeScript. Cats vs dogs in
the neighborhood; later chapters will introduce other species.

Repo: https://github.com/sublimestate/creature-clash (private)

## Stack

- **Framework**: React Native + Expo SDK 54, Expo Router (file-based routes),
  Reanimated 4, TypeScript
- **State**: Zustand 4.x persisted via AsyncStorage (web → localStorage)
- **Audio**: `expo-audio` (SDK 54's replacement for `expo-av`). Procedural
  one-shot SFX live in `app/assets/audio/`; `SoundManager` preloads them at boot.
- **Cloud**: `@supabase/supabase-js` v2. Magic-link auth + last-write-wins
  save sync. Gated on `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  — without those env vars the cloud layer no-ops and the app runs
  offline-only.
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
npm run typecheck           # tsc --noEmit
```

If you add or rename a route, run `expo start` once so it regenerates
`.expo/types/router.d.ts`. The typed-router error message looks like
`Argument of type '/foo' is not assignable to ...` — that's stale types,
not a real bug.

To see `console.log` output from any test (sprite dumps, balance simulator),
run `npx vitest run --reporter=verbose <path>`. Plain `npm test` swallows it.

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
│   ├── auth/
│   │   ├── sign-in.tsx           # magic-link email entry + cloud-save status
│   │   └── callback.tsx          # magic-link landing; bounces home post-auth
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
│   │   ├── playerStore.ts        # zustand persist, version 2, with migrate;
│   │   │                         #   exports localUpdatedAt + buildSyncableSnapshot
│   │   └── audioStore.ts         # persisted sfxMuted flag (device-local)
│   ├── audio/
│   │   ├── sounds.ts             # SfxId catalog + require()s for WAV assets
│   │   └── SoundManager.ts       # singleton: preloads players, seekTo+play,
│   │                             #   master volume / mute
│   ├── cloud/
│   │   ├── supabase.ts           # lazy createClient gated on EXPO_PUBLIC_*
│   │   ├── authStore.ts          # zustand store: session, magic-link helpers
│   │   └── sync.ts               # LWW sync: subscribe to playerStore, debounce
│   │                             #   push; pull on sign-in once hydrated
│   ├── components/
│   │   ├── battle/               # BattleUnit, HealthBar, DamageNumber
│   │   ├── creatures/            # CreatureCard, FieldJournal (encyclopedia)
│   │   └── common/               # CreatureSprite, PixelSprite, CurrencyHeader,
│   │                             #   RarityBadge
│   ├── types/index.ts            # shared types (CreatureType, BattleEvent, etc.)
│   └── theme.ts                  # COLORS + RARITY_COLORS
├── assets/audio/                 # synthesized CC0 SFX (tap, hit, dodge, faint,
│                                 #   victory, defeat, level_up, recruit) ~140KB
├── app.json                      # web.output: "static" — DON'T set "single"
├── metro.config.js               # disables package-exports (see Stack notes)
├── vitest.config.ts
└── package.json

supabase/
└── migrations/
    └── 0001_init.sql             # saves table + RLS policies. Apply once in
                                  #   Supabase SQL editor before enabling sync.
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

`src/data/spriteGenerator.ts` is the main path: procedural drawing primitives
(ellipse, rect, triangle, polyline, thickLine) compose 32×32 full-body
sprites via per-animal composers (`generateCat`, `generateDog`, `generateWolf`,
`generateBird`, `generateOwl`). Every composer ends with `finish(g)` which
runs the **outline pass** (edge body pixels → palette 2) and **highlight
pass** (topmost interior pixel per column → palette 3). That pipeline is
what makes sprites read as polished — don't bypass it.

`src/data/pixelSprites.ts` wires generators into `TEMPLATES` and each
creature picks a template + a 9-color palette. Templates declare their own
`grid: 16 | 32` so legacy 16×16 templates remain renderable. The `tmpl()`
helper validates row dimensions at module load; mistakes throw immediately.
`<PixelSprite>` reads the per-template grid size and renders cells as Views.

### Save / persistence

Zustand persist key `creature-clash-player`, version `2`. Bump version + extend
the `migrate` callback whenever you change the persisted schema or rename a
creature ID. The migrate function wipes data; the rehydrate hook adopts
legacy saves by marking `hasSelectedStarter = true` if they already have
creatures.

Persisted fields beyond the obvious: `hasSelectedStarter` (gates onboarding
redirect), `hasSeenOutro` (gates final-boss outro), `seenChapterIntros`
(gates chapter intros), `metCreatures` (drives Field Journal silhouettes),
`localUpdatedAt` (LWW clock for cloud sync; see below).

Starter flow: new players are redirected to `/onboarding/select-starter`
(picks 2 of 5 commons + sets trainer name + nicknames). After `selectStarters`,
they have 2 pets at level 3, 200 gold, 500 gems.

`resetAll()` clears everything (including `hasSelectedStarter`) and is wired
to the home-screen "Start New Game" button (two-tap confirm).

### Audio

`src/audio/SoundManager.ts` is a singleton that preloads one `AudioPlayer`
per SFX at app boot (via `_layout.tsx`). `playSfx(id)` does `seekTo(0)` +
`play()`, so rapid re-triggers restart the sample instead of stacking.
Mute state lives in `audioStore` (separate from playerStore so it never
syncs to the cloud — it's a device preference).

SFX assets in `app/assets/audio/` are synthesized 22.05kHz 16-bit mono WAVs.
They're placeholders — drop in higher-fidelity files with the same names
and the manager picks them up unchanged.

Wired event triggers:
- Battle: `hit` / `dodge` per attack, `faint` on KO, `victory` / `defeat`
  on `battle_end`, `level_up` (700ms stagger) and `recruit` (1500ms stagger)
  in the rewards block.
- UI: `tap` on Continue/Retry, FIGHT, stage tiles, home tab buttons,
  mute toggle. Not on every Pressable in the app — keep it judicious.

### Cloud sync (Supabase)

Optional, gated on `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
Without them, `getSupabase()` returns null and the auth/sync layers no-op
so the app still runs offline.

**Schema**: a single `saves` table keyed by `user_id`, with `data` (jsonb
holding the `SyncableSnapshot`), `version` (matches playerStore persist
version), and `updated_at`. RLS limits each row to its owner. Apply
`supabase/migrations/0001_init.sql` once in the Supabase SQL editor before
enabling sync.

**Auth**: email magic link only (`signInWithOtp` with `emailRedirectTo` set
via `Linking.createURL('/auth/callback')`). The callback route relies on
`detectSessionInUrl: true` to pick up the hash on web load. For native, the
`scheme: "app"` in `app.json` produces `app://auth/callback`. Configure both
in the Supabase project's Site URL / Redirect URLs.

**Sync strategy**: last-write-wins by `localUpdatedAt`. The `sync.ts`
subscriber computes a stable JSON of syncable fields on every store change;
if it differs from the previous serialization, it stamps `localUpdatedAt =
Date.now()` and schedules a debounced push (2.5s). On sign-in, it pulls
once playerStore is hydrated (NOT before — otherwise AsyncStorage hydration
clobbers the freshly-pulled snapshot) and compares timestamps. Cloud-newer
replaces local via `applyCloudSnapshot`; local-newer-or-equal pushes.

**Schema-version mismatch**: a cloud save from a different schema version
is refused — local state is preserved and the next push will overwrite the
cloud copy. Bump `SCHEMA_VERSION` in `sync.ts` whenever you bump the
persisted playerStore version.

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
Home "Cloud Save" button   → /auth/sign-in (email magic link)
Magic link click           → /auth/callback → home (signed in)
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
- **Sprites**: procedural 32×32 full-body sprites for every creature
  with outline + top-highlight finish pipeline
- **Audio**: SFX scaffold via `expo-audio`. Placeholder synthesized SFX
  for tap / hit / dodge / faint / level_up / recruit / victory / defeat,
  wired into battle events and major UI taps. Mute toggle on home screen.
- **Cloud save scaffold**: Supabase magic-link auth + LWW save sync.
  Gated on env vars; no-op if unconfigured.
- **Web**: clean static export; tested only on web
- **Balance simulator**: `src/engine/__tests__/balance.test.ts` is
  informational, never fails. Simulates each stage 100× across player
  progression scenarios and logs win-rate tables to console.

## Not yet done

- BGM (background music tracks per screen) — only one-shot SFX are wired
- Higher-fidelity SFX (current files are synthesized placeholders)
- End-to-end cloud-sync smoke test against a real Supabase project, plus
  rotation-friendly env handling (project URL is currently a single env var)
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
