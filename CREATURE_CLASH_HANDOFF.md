# Creature Clash — Auto-Battler Mobile Game Handoff

## Project Overview

Build a Pokemon-inspired auto-battler mobile game where players collect creatures via gacha pulls, build teams, set formations, and watch them battle automatically. The game monetizes through in-app purchases (premium currency for gacha pulls and cosmetics).

**Platform:** iOS + Android (single codebase)
**Art Style:** Polished 2D pixel art
**Core Loop:** Collect → Build Team → Auto-Battle → Earn Rewards → Pull More Creatures
**Monetization:** Gacha system + cosmetic skins (in-app purchases)

---

## Tech Stack

| Component | Tool | Why |
|-----------|------|-----|
| Framework | React Native + Expo (SDK 52+) | TypeScript, cross-platform, New Architecture by default |
| Navigation | Expo Router | File-based routing, familiar Next.js mental model |
| State Management | Zustand | Lightweight, TypeScript-friendly, no boilerplate |
| Animations | React Native Reanimated 3 | UI-thread animations for battle effects, 60fps |
| Backend | Node.js + TypeScript | API server for user accounts, gacha logic, leaderboards |
| Database | PostgreSQL (via Supabase) | User data, creature inventories, battle history |
| Auth | Supabase Auth | Email/password + Google/Apple sign-in |
| In-App Purchases | RevenueCat (`react-native-purchases`) | Handles iOS/Android purchase logic, receipt validation |
| Real-time (PvP, future) | Supabase Realtime or WebSocket | Live PvP battles |
| Analytics | RevenueCat dashboard + Expo Analytics | Revenue tracking, user metrics |
| Pixel Art | Aseprite or Libresprite | Creature sprites + animations |

### Key Dependencies

```bash
npx create-expo-app creature-clash --template tabs
cd creature-clash

# Core
npx expo install expo-router expo-image
npm install zustand

# Animations
npx expo install react-native-reanimated react-native-gesture-handler

# Backend / Auth
npm install @supabase/supabase-js

# In-App Purchases
npm install react-native-purchases

# Audio
npx expo install expo-av

# Storage
npx expo install expo-secure-store @react-native-async-storage/async-storage
```

### App Store Requirements

- Apple Developer Account ($99/year) — required for iOS App Store
- Google Play Developer Account ($25 one-time) — required for Play Store
- EAS Build (Expo Application Services) — for building native binaries
- RevenueCat account (free tier covers up to $2.5K monthly tracked revenue)

---

## Game Design Document

### Core Gameplay Loop

```
1. COLLECT — Pull creatures from gacha banners using currency
2. BUILD — Assemble a team of 5 creatures, arrange in formation (front/back row)
3. BATTLE — Tap "Fight" → creatures auto-battle based on stats, abilities, type matchups
4. REWARD — Win battles → earn gold + XP + gacha currency
5. UPGRADE — Level up creatures, evolve them, equip items
6. REPEAT — Progress through campaign stages, climb PvP ranks
```

### Creature System

#### Stats

Every creature has these base stats (scale with level):

| Stat | Description |
|------|-------------|
| HP | Health points — reaches 0, creature faints |
| ATK | Physical attack power |
| DEF | Physical defense — reduces incoming ATK damage |
| SP_ATK | Special attack power |
| SP_DEF | Special defense — reduces incoming SP_ATK damage |
| SPD | Speed — determines turn order in battle |

#### Types (elemental system)

Use a simple 6-type system for MVP (expandable later):

| Type | Strong Against | Weak Against |
|------|---------------|-------------|
| Fire | Nature, Ice | Water, Earth |
| Water | Fire, Earth | Nature, Electric |
| Nature | Water, Earth | Fire, Ice |
| Electric | Water, Ice | Earth, Nature |
| Earth | Fire, Electric | Water, Nature |
| Ice | Nature, Water | Fire, Electric |

**Type advantage = 1.5x damage, disadvantage = 0.67x damage**

#### Rarity Tiers

| Rarity | Base Stat Total | Gacha Rate | Color |
|--------|----------------|------------|-------|
| Common | 250-300 | 55% | Gray |
| Uncommon | 300-350 | 25% | Green |
| Rare | 350-400 | 13% | Blue |
| Epic | 400-450 | 5% | Purple |
| Legendary | 450-520 | 2% | Gold |

#### MVP Creature Roster (20 creatures)

Design 20 creatures across all types and rarities for launch. Each needs:
- Name
- Type
- Rarity
- Base stats (HP, ATK, DEF, SP_ATK, SP_DEF, SPD)
- 2 abilities (1 basic attack, 1 special move)
- Pixel art sprite (idle pose, attack animation, faint animation)
- Short flavor text / description

**Example creature designs (for art direction):**

| Name | Type | Rarity | Concept |
|------|------|--------|---------|
| Emberpup | Fire | Common | Small fire wolf cub |
| Tidecrab | Water | Common | Blue crab with bubble armor |
| Thornlet | Nature | Common | Tiny plant creature with thorns |
| Voltmouse | Electric | Common | Electric mouse with spark tail |
| Mudbrick | Earth | Common | Small golem made of clay |
| Frostkit | Ice | Common | White fox with icy breath |
| Blazefang | Fire | Uncommon | Larger fire wolf, sharper teeth |
| Coralshell | Water | Uncommon | Hermit crab with coral shell |
| Vinelash | Nature | Uncommon | Vine creature with whip arms |
| Sparkwing | Electric | Uncommon | Electric bird, small lightning bolts |
| Ironmole | Earth | Uncommon | Armored mole with metal claws |
| Glacierhorn | Ice | Rare | Ice ram with crystal horns |
| Infernox | Fire | Rare | Fire lizard wreathed in flames |
| Tsunamaw | Water | Rare | Shark-like creature with wave fin |
| Stormraptor | Electric | Rare | Large electric hawk |
| Terradon | Earth | Epic | Massive stone dinosaur |
| Blizzking | Ice | Epic | Ice yeti with frozen crown |
| Phoenixflare | Fire | Legendary | Phoenix rising from pixel flames |
| Leviatide | Water | Legendary | Sea serpent, tidal wave aura |
| Thunderlord | Electric | Legendary | Storm dragon with lightning body |

### Battle System

#### Auto-Battle Flow

```
1. Both teams placed in formation (front row: 3, back row: 2)
2. Sort all creatures by SPD (highest goes first)
3. Each turn:
   a. Active creature selects ability (AI logic):
      - If enemy has type weakness → use ability targeting that enemy
      - If own HP < 30% → prioritize self-buff/heal if available
      - Otherwise → attack lowest HP enemy
   b. Calculate damage (see formula below)
   c. Apply damage, check for faints
   d. If one team fully fainted → battle ends
4. Victory rewards calculated based on stage difficulty
```

#### Damage Formula

```
damage = ((2 * level / 5 + 2) * power * (atk / def)) / 50 + 2
damage *= type_multiplier  (1.5 super effective, 0.67 not effective, 1.0 neutral)
damage *= random(0.85, 1.0)  (slight variance)
```

Where:
- `level` = attacker's level
- `power` = ability base power
- `atk` = ATK or SP_ATK depending on ability type
- `def` = DEF or SP_DEF of target depending on ability type

#### Formation / Positioning

```
FRONT ROW (3 slots):
  [Slot 1] [Slot 2] [Slot 3]
  - Takes hits first
  - Melee creatures go here
  - Higher DEF creatures preferred

BACK ROW (2 slots):
  [Slot 4] [Slot 5]
  - Protected while front row alive
  - Ranged/special attackers go here
  - Back row can only be targeted after front row is defeated
```

#### Battle Speed Control

- 1x speed (default)
- 2x speed (unlock at stage 5)
- 3x speed / skip animation (unlock at stage 20 or premium)

### Ability System

Each creature has 2 abilities:

**Basic Attack** — low cooldown, moderate damage
**Special Move** — higher cooldown (3-4 turns), stronger effect (damage, buff, debuff, heal)

Example abilities:

| Ability | Type | Power | Cooldown | Effect |
|---------|------|-------|----------|--------|
| Scratch | Normal | 40 | 0 | Basic physical attack |
| Flame Burst | Fire | 65 | 3 | Fire damage + 20% burn chance (DOT) |
| Tidal Wave | Water | 70 | 4 | Water damage to all enemies (reduced) |
| Vine Wrap | Nature | 55 | 3 | Nature damage + SPD debuff 2 turns |
| Thunder Bolt | Electric | 65 | 3 | Electric damage + 10% paralyze (skip turn) |
| Rock Wall | Earth | 0 | 4 | Buff own team DEF +30% for 2 turns |
| Ice Shard | Ice | 60 | 2 | Ice damage + priority (always goes first) |

### Progression Systems

#### Creature Leveling

- Creatures gain XP from battles
- Level cap: 50 (MVP), expandable later
- Stats increase per level based on rarity growth rates
- Every 10 levels = significant stat jump

#### Evolution (Phase 2)

- Certain creatures evolve at specific levels (e.g., Emberpup → Blazefang at level 20)
- Evolution requires level + evolution materials (earned from stages)
- Evolved form has higher base stats and unlocks a 3rd ability

#### Campaign Stages

- 10 chapters, 10 stages each = 100 stages at launch
- Each stage has 3 waves of enemies
- 3-star rating system (stars based on: no faints, speed, HP remaining)
- Stars unlock rewards
- Difficulty scales with each chapter (enemy levels, type variety, boss stages at end of chapter)

---

## Gacha System (Monetization Core)

### Currency

| Currency | How Earned | How Purchased | Use |
|----------|-----------|--------------|-----|
| Gold | Battle rewards, daily login | Cannot be purchased | Level up creatures, buy basic items |
| Gems (premium) | Achievement rewards, daily login (small amount), campaign milestones | IAP ($0.99-$49.99 packs) | Gacha pulls, energy refills, cosmetics |

### Gacha Pull Rates

| Pull Type | Cost | Guaranteed |
|-----------|------|-----------|
| Single Pull | 100 Gems | Nothing guaranteed |
| 10-Pull | 900 Gems (10% discount) | At least 1 Rare or higher |
| Free Daily Pull | Free, 1 per day | Nothing guaranteed |

### Pity System

- After 50 pulls without an Epic → next pull guarantees Epic
- After 100 pulls without a Legendary → next pull guarantees Legendary
- Pity counter carries across banners
- This is CRITICAL for player trust and retention

### IAP Pricing (RevenueCat Products)

| Product ID | Price | Gems | Bonus |
|-----------|-------|------|-------|
| gems_small | $0.99 | 100 | — |
| gems_medium | $4.99 | 550 | +10% |
| gems_large | $9.99 | 1200 | +20% |
| gems_xl | $24.99 | 3300 | +32% |
| gems_mega | $49.99 | 7000 | +40% |
| monthly_pass | $4.99/mo | 300 gems/day + 2x daily pull | Best value |

### Cosmetic Skins (No Gameplay Advantage)

- Alternate color palettes for creatures (e.g., Shadow Emberpup, Golden Tidecrab)
- Priced at 200-500 Gems each
- Purely visual — does NOT affect stats
- Rotate available skins weekly to create urgency

---

## App Architecture

### Directory Structure (Expo Router)

```
creature-clash/
├── app/
│   ├── _layout.tsx              # Root layout (auth check, providers)
│   ├── index.tsx                # Splash / loading screen
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar layout
│   │   ├── home.tsx             # Main dashboard (daily rewards, news)
│   │   ├── battle.tsx           # Campaign map + stage select
│   │   ├── creatures.tsx        # Creature collection / team builder
│   │   ├── gacha.tsx            # Gacha pull screen
│   │   └── profile.tsx          # Player profile, settings
│   ├── battle/
│   │   └── [stageId].tsx        # Active battle screen
│   ├── creature/
│   │   └── [creatureId].tsx     # Creature detail / level up
│   └── shop.tsx                 # IAP store (gem packages)
├── src/
│   ├── components/
│   │   ├── battle/
│   │   │   ├── BattleField.tsx      # Battle arena layout
│   │   │   ├── CreatureSprite.tsx    # Animated pixel sprite component
│   │   │   ├── HealthBar.tsx        # HP bar with animation
│   │   │   ├── DamageNumber.tsx     # Floating damage text
│   │   │   ├── AbilityEffect.tsx    # Visual effects for abilities
│   │   │   └── BattleLog.tsx        # Turn-by-turn text log
│   │   ├── gacha/
│   │   │   ├── GachaBanner.tsx      # Pull banner with rates
│   │   │   ├── PullAnimation.tsx    # Gacha pull reveal animation
│   │   │   └── PityCounter.tsx      # Shows pity progress
│   │   ├── creatures/
│   │   │   ├── CreatureCard.tsx      # Card display (collection view)
│   │   │   ├── TeamSlot.tsx         # Team builder drag slot
│   │   │   └── FormationGrid.tsx    # 3x2 formation layout
│   │   └── common/
│   │       ├── CurrencyDisplay.tsx  # Gold + Gems header
│   │       ├── RarityBadge.tsx      # Color-coded rarity label
│   │       └── StarRating.tsx       # 3-star stage rating
│   ├── engine/
│   │   ├── battle.ts            # Core battle simulation logic
│   │   ├── damage.ts            # Damage calculation formula
│   │   ├── ai.ts                # Enemy team AI / target selection
│   │   ├── types.ts             # Type effectiveness chart
│   │   └── gacha.ts             # Gacha pull logic with pity
│   ├── data/
│   │   ├── creatures.ts         # Creature definitions (stats, abilities, art refs)
│   │   ├── abilities.ts         # Ability definitions
│   │   ├── stages.ts            # Campaign stage data (enemies, rewards)
│   │   └── shop.ts              # IAP product definitions
│   ├── stores/
│   │   ├── playerStore.ts       # Zustand: player data, currency, inventory
│   │   ├── battleStore.ts       # Zustand: active battle state
│   │   └── settingsStore.ts     # Zustand: settings, preferences
│   ├── services/
│   │   ├── supabase.ts          # Supabase client init
│   │   ├── auth.ts              # Auth service (login, register, session)
│   │   ├── sync.ts              # Cloud save / load player data
│   │   └── purchases.ts        # RevenueCat wrapper
│   ├── hooks/
│   │   ├── useBattle.ts         # Battle flow hook
│   │   ├── useGacha.ts          # Gacha pull hook
│   │   └── usePurchases.ts      # IAP hook (RevenueCat)
│   ├── utils/
│   │   ├── sprites.ts           # Sprite sheet loading helpers
│   │   ├── audio.ts             # Sound effect helpers
│   │   └── format.ts            # Number formatting, time helpers
│   └── types/
│       ├── creature.ts          # Creature type definitions
│       ├── battle.ts            # Battle-related types
│       ├── player.ts            # Player/inventory types
│       └── gacha.ts             # Gacha types
├── assets/
│   ├── sprites/                 # Pixel art sprite sheets
│   │   ├── creatures/           # One folder per creature
│   │   │   ├── emberpup/
│   │   │   │   ├── idle.png
│   │   │   │   ├── attack.png
│   │   │   │   └── faint.png
│   │   │   └── ...
│   │   ├── effects/             # Ability visual effects
│   │   └── ui/                  # UI elements, buttons, frames
│   ├── audio/
│   │   ├── bgm/                 # Background music (battle, menu, victory)
│   │   └── sfx/                 # Sound effects (hit, pull, level up)
│   └── fonts/                   # Pixel-style fonts
├── supabase/
│   └── migrations/              # Database schema migrations
├── server/                      # Backend API (if needed beyond Supabase)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── package.json
├── CLAUDE.md                    # Claude Code project instructions
├── app.json                     # Expo config
├── package.json
└── tsconfig.json
```

### Database Schema (Supabase / PostgreSQL)

```sql
-- Users
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    display_name TEXT NOT NULL,
    gold INTEGER DEFAULT 0,
    gems INTEGER DEFAULT 0,
    player_level INTEGER DEFAULT 1,
    player_xp INTEGER DEFAULT 0,
    gacha_pity_counter INTEGER DEFAULT 0,
    last_free_pull TIMESTAMPTZ,
    last_daily_login DATE,
    daily_login_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player's creature inventory
CREATE TABLE player_creatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    creature_id TEXT NOT NULL,          -- references creature definition key
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    skin_id TEXT,                       -- cosmetic skin (nullable)
    acquired_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player's active team
CREATE TABLE player_team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    slot_position INTEGER NOT NULL CHECK (slot_position BETWEEN 1 AND 5),
    creature_instance_id UUID REFERENCES player_creatures(id),
    UNIQUE (player_id, slot_position)
);

-- Campaign progress
CREATE TABLE campaign_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL,
    stars INTEGER DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, stage_id)
);

-- Battle history (for analytics)
CREATE TABLE battle_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    stage_id TEXT,
    result TEXT CHECK (result IN ('win', 'loss')),
    turns INTEGER,
    team_snapshot JSONB,               -- snapshot of player's team at battle time
    fought_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase history (supplement RevenueCat)
CREATE TABLE purchase_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    gems_granted INTEGER,
    revenue_cat_transaction_id TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RevenueCat Setup

```typescript
// src/services/purchases.ts
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEYS = {
    apple: 'appl_XXXXXXXX',    // From RevenueCat dashboard
    google: 'goog_XXXXXXXX',   // From RevenueCat dashboard
};

export async function initPurchases(userId: string) {
    Purchases.configure({
        apiKey: Platform.OS === 'ios' ? API_KEYS.apple : API_KEYS.google,
        appUserID: userId,
    });
}

export async function getOfferings() {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
}

export async function purchaseGems(packageToPurchase: any) {
    try {
        const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
        // Grant gems based on product ID
        return customerInfo;
    } catch (e: any) {
        if (!e.userCancelled) {
            throw e;
        }
        return null;
    }
}

export async function restorePurchases() {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
}
```

### Battle Engine Core

```typescript
// src/engine/battle.ts

interface BattleCreature {
    id: string;
    name: string;
    type: CreatureType;
    level: number;
    stats: {
        hp: number;
        maxHp: number;
        atk: number;
        def: number;
        spAtk: number;
        spDef: number;
        spd: number;
    };
    abilities: Ability[];
    cooldowns: Map<string, number>;
    position: 'front' | 'back';
    statusEffects: StatusEffect[];
    isAlive: boolean;
}

interface BattleTurn {
    attacker: string;        // creature id
    target: string;          // creature id
    ability: string;         // ability id
    damage: number;
    effectiveness: 'super' | 'normal' | 'weak';
    isCrit: boolean;
    targetFainted: boolean;
}

export function simulateBattle(
    playerTeam: BattleCreature[],
    enemyTeam: BattleCreature[]
): BattleTurn[] {
    const turns: BattleTurn[] = [];
    const allCreatures = [...playerTeam, ...enemyTeam];

    while (hasAlive(playerTeam) && hasAlive(enemyTeam)) {
        // Sort by speed for turn order
        const turnOrder = allCreatures
            .filter(c => c.isAlive)
            .sort((a, b) => b.stats.spd - a.stats.spd);

        for (const creature of turnOrder) {
            if (!creature.isAlive) continue;
            if (!hasAlive(playerTeam) || !hasAlive(enemyTeam)) break;

            // Determine if this creature belongs to player or enemy
            const isPlayer = playerTeam.includes(creature);
            const opponents = isPlayer ? enemyTeam : playerTeam;

            // AI selects target and ability
            const { target, ability } = selectAction(creature, opponents);

            // Calculate and apply damage
            const turn = executeTurn(creature, target, ability);
            turns.push(turn);

            // Tick cooldowns
            tickCooldowns(creature);
        }

        // Apply status effects (burn DOT, poison, etc.)
        applyStatusEffects(allCreatures);
    }

    return turns;
}
```

### Gacha Pull Logic

```typescript
// src/engine/gacha.ts

import { CREATURES } from '../data/creatures';

const RARITY_RATES = {
    common: 0.55,
    uncommon: 0.25,
    rare: 0.13,
    epic: 0.05,
    legendary: 0.02,
};

const PITY_EPIC = 50;       // Guaranteed epic after 50 pulls
const PITY_LEGENDARY = 100; // Guaranteed legendary after 100 pulls

export function performPull(pityCounter: number): {
    creature: CreatureDefinition;
    newPityCounter: number;
} {
    let rarity: Rarity;

    // Check pity
    if (pityCounter >= PITY_LEGENDARY) {
        rarity = 'legendary';
    } else if (pityCounter >= PITY_EPIC) {
        rarity = 'epic';
    } else {
        // Roll rarity
        const roll = Math.random();
        let cumulative = 0;
        rarity = 'common'; // fallback

        for (const [r, rate] of Object.entries(RARITY_RATES)) {
            cumulative += rate;
            if (roll <= cumulative) {
                rarity = r as Rarity;
                break;
            }
        }
    }

    // Reset pity if epic+ pulled
    const newPityCounter = (rarity === 'epic' || rarity === 'legendary')
        ? 0
        : pityCounter + 1;

    // Pick random creature of that rarity
    const pool = CREATURES.filter(c => c.rarity === rarity);
    const creature = pool[Math.floor(Math.random() * pool.length)];

    return { creature, newPityCounter };
}

export function performTenPull(pityCounter: number): {
    creatures: CreatureDefinition[];
    newPityCounter: number;
} {
    const creatures: CreatureDefinition[] = [];
    let currentPity = pityCounter;

    for (let i = 0; i < 10; i++) {
        const result = performPull(currentPity);
        creatures.push(result.creature);
        currentPity = result.newPityCounter;
    }

    // Guarantee at least 1 rare+ in a 10-pull
    const hasRarePlus = creatures.some(c =>
        ['rare', 'epic', 'legendary'].includes(c.rarity)
    );
    if (!hasRarePlus) {
        // Replace last common with a random rare
        const rarePool = CREATURES.filter(c => c.rarity === 'rare');
        creatures[9] = rarePool[Math.floor(Math.random() * rarePool.length)];
    }

    return { creatures, newPityCounter: currentPity };
}
```

---

## Pixel Art Guidelines

### Sprite Specifications

| Asset | Dimensions | Frames | Format |
|-------|-----------|--------|--------|
| Creature idle | 64x64 px | 4 frames (looping) | PNG sprite sheet |
| Creature attack | 64x64 px | 6 frames | PNG sprite sheet |
| Creature faint | 64x64 px | 4 frames | PNG sprite sheet |
| Creature icon (UI) | 32x32 px | 1 frame | PNG |
| Ability effects | 128x128 px | 6-8 frames | PNG sprite sheet |
| UI buttons | Various | 1-2 frames (normal/pressed) | PNG |

### Art Direction

- **Color palette:** Limit each creature to 8-12 colors max for clean pixel art
- **Style reference:** Think Pokemon Gen 3-4 sprite style (GBA era) but slightly larger
- **Readable silhouettes:** Each creature should be identifiable by silhouette alone
- **Type color coding:** Fire creatures lean warm (reds, oranges), Water lean cool (blues), etc.
- **Consistent lighting:** Top-left light source across all sprites
- **Scale:** Creatures should fill ~70-80% of their 64x64 canvas

### Sprite Sheet Format

```
Each sprite sheet is a horizontal strip:
[Frame1][Frame2][Frame3][Frame4]...

Load with:
- frameWidth: 64
- frameHeight: 64
- frameCount: varies by animation
- frameDuration: 150ms (idle), 100ms (attack), 200ms (faint)
```

### Placeholder Art Strategy

For development, use colored rectangles or simple shapes as placeholders:
```typescript
// Temporary until real sprites exist
const PLACEHOLDER_COLORS: Record<CreatureType, string> = {
    fire: '#FF6B35',
    water: '#4ECDC4',
    nature: '#45B649',
    electric: '#FFD93D',
    earth: '#C4A35A',
    ice: '#B8D4E3',
};
```

Build the full game with placeholders first, then swap in real pixel art. Do NOT block development on art.

---

## Phased Build Plan

### Phase 1: Core Loop (Week 1-2)
**Goal:** Playable battle with placeholder art

- [ ] Expo project setup with Expo Router tabs
- [ ] Creature data definitions (stats, types, abilities)
- [ ] Type effectiveness chart
- [ ] Damage calculation engine
- [ ] Auto-battle simulation (runs in JS, returns array of turns)
- [ ] Basic battle screen (show HP bars, turn log, outcome)
- [ ] Placeholder creature sprites (colored squares)
- [ ] Team builder screen (select 5 from roster)
- [ ] Basic formation layout (front 3 / back 2)

### Phase 2: Gacha + Progression (Week 3-4)
**Goal:** Collectible creatures with gacha pulls

- [ ] Supabase setup (auth + database)
- [ ] Player account creation / login
- [ ] Gacha pull logic with pity system
- [ ] Gacha pull screen with animation
- [ ] Gold + Gem currency system
- [ ] Creature inventory screen
- [ ] Creature leveling (XP from battles)
- [ ] Campaign stage select (10 stages for testing)
- [ ] Battle rewards (gold, XP, gems)
- [ ] Daily free pull

### Phase 3: Polish + Monetization (Week 5-6)
**Goal:** Monetizable, shippable MVP

- [ ] RevenueCat integration (gem purchase packs)
- [ ] IAP store screen
- [ ] Real pixel art for at least 10 creatures
- [ ] Battle animations (Reanimated — sprite movements, damage numbers, HP drain)
- [ ] Gacha pull reveal animation (rarity-appropriate fanfare)
- [ ] Sound effects (battle hits, pull sounds, UI taps)
- [ ] Background music (battle theme, menu theme)
- [ ] Campaign stages 1-50
- [ ] Daily login rewards
- [ ] Settings screen (sound toggle, account link)
- [ ] EAS Build + TestFlight / internal testing

### Phase 4: Launch + Iterate (Week 7-8)
**Goal:** Live on App Store + Play Store

- [ ] Remaining 10 creature sprites
- [ ] Cosmetic skins for 5 popular creatures
- [ ] App Store listing (screenshots, description, keywords)
- [ ] Play Store listing
- [ ] Soft launch (limited regions or TestFlight public link)
- [ ] Monitor RevenueCat analytics
- [ ] Fix bugs, balance creature stats based on play data
- [ ] Full public launch

### Phase 5: Growth Features (Post-Launch)
- [ ] PvP arena (real-time or async)
- [ ] Evolution system
- [ ] Guild system
- [ ] Limited-time gacha banners (seasonal creatures)
- [ ] Events (boss raids, tournaments)
- [ ] More creatures (expand to 50+)
- [ ] Leaderboards

---

## Audio

### Music Needed (MVP)

| Track | Style | Duration |
|-------|-------|----------|
| Menu theme | Chill pixel-game vibe | 60-90s loop |
| Battle theme | Upbeat, energetic | 60-90s loop |
| Boss battle | Intense, faster tempo | 60-90s loop |
| Victory fanfare | Triumphant, short | 5-10s |
| Defeat | Somber, short | 5-10s |
| Gacha pull | Building suspense → reveal | 10-15s |

### Sound Effects Needed

- Battle: hit_normal, hit_super_effective, hit_weak, creature_faint, ability_fire, ability_water, ability_electric, ability_nature, ability_earth, ability_ice
- UI: button_tap, tab_switch, menu_open, menu_close
- Gacha: pull_start, reveal_common, reveal_rare, reveal_epic, reveal_legendary
- Progression: level_up, xp_gain, gold_gain, gem_gain

**Sources for free game audio:**
- Freesound.org (CC0/CC-BY effects)
- OpenGameArt.org (chiptune music + pixel SFX)
- itch.io game asset packs

---

## Environment Variables

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# RevenueCat
REVENUECAT_APPLE_API_KEY=appl_XXXXXXXX
REVENUECAT_GOOGLE_API_KEY=goog_XXXXXXXX
```

---

## First Run Checklist

1. [ ] Create Expo project: `npx create-expo-app creature-clash`
2. [ ] Install all dependencies
3. [ ] Set up Supabase project + run migrations
4. [ ] Define creature data in `src/data/creatures.ts`
5. [ ] Build battle engine (pure logic, no UI)
6. [ ] Write tests for damage calc + gacha rates
7. [ ] Build battle screen with placeholder art
8. [ ] Build team builder
9. [ ] Get one full loop working: select team → battle → win → get rewards
10. [ ] Then layer on gacha, progression, IAP

---

## Key Design Principles

1. **Battle-first development** — The battle engine is the core. Make it fun with placeholder art before worrying about anything else.
2. **Server-authoritative gacha** — Never let the client decide pull results. All gacha logic runs server-side (Supabase Edge Function) to prevent cheating.
3. **Generous early game** — Give new players lots of free pulls and gems. Hook them before asking for money.
4. **No pay-to-win** — Paying players get MORE creatures and skins, not STRONGER creatures. Balance matters for retention.
5. **Placeholder art is fine** — Don't block any development on art. Build everything with colored squares first.
