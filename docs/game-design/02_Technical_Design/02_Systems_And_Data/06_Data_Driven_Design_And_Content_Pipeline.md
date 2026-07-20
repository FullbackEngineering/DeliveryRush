# 06 — Data-Driven Design & Content Pipeline (Delivery Rush)

## Overview

Delivery Rush is fully data-driven. Design tuning, vehicles, cards, themes, and orders are defined as TypeScript data objects in `src/data/`, not hardcoded in logic. Balance numbers live in `src/core/Balance.ts` and can be tweaked without touching game systems. This chapter documents the schemas, validation rules, and pipeline.

---

## What Is Externalized vs. Kept In Code

| **Externalized to Data** | **Kept In Code (Logic)** |
|---|---|
| Vehicle stats (speed, acceleration, handling) | Vehicle physics engine (exponential damping formula) |
| Card effect definitions (coinBonus, freeFirstCrash) | Card application logic (when to apply bonus, how to resolve) |
| Order kinds (pizza, coffee, sushi) and rewards | Order scoring formula (baseReward × multiplier × VIP) |
| Themes (colors, hazard density) | Procedural city generation algorithm |
| Balance tuning numbers (comboCap, orderTimeStart) | Combo increment/reset logic |
| UI text, localization strings | Input processing, rendering pipeline |
| Difficulty curve parameters | Difficulty ramp implementation |

---

## Content Schemas & Validation

### 1. Vehicle Definition Schema

**File:** `src/data/vehicles.ts`

**TypeScript Schema:**

```typescript
export interface VehicleStats {
  speed: number;            // px/s at cruise; range [150, 380]
  acceleration: number;     // px/s²; range [50, 150]
  handling: number;         // 0..1 turn snappiness; range [0.4, 1.0]
  braking: number;          // px/s² deceleration; range [80, 200]
  durability: number;       // crash hit count; range [1, 5]
  fuel: number;             // reserved; range [100, ∞)
  nitro: number;            // reserved 0..1; range [0, 1]
  cargo: number;            // slots; MVP = 1
}

export interface VehicleDef {
  id: string;               // unique: "starter", "sport", "super", "hyper"
  name: string;             // display name; 1–20 chars
  base: VehicleStats;       // level 1 stats
  growth: Partial<VehicleStats>; // per-level additive bonus (e.g., +10 speed per level)
  unlockCost: number;       // coins to unlock; 0 = starter (free), -1 = locked (premium)
  bodyColor: number;        // hex color
  accentColor: number;      // hex color
  maxLevel: number;         // max upgrade level; range [5, 20]
}
```

**Example Entry:**

```typescript
{
  id: "sport",
  name: "Sport",
  base: { speed: 280, acceleration: 100, handling: 0.8, braking: 140, durability: 3, ... },
  growth: { speed: 15, acceleration: 5, braking: 8, ... },
  unlockCost: 5000,      // costs 5000 coins to unlock
  bodyColor: 0xff0000,
  accentColor: 0xffff00,
  maxLevel: 10,
}
```

**Validation Rules:**
- ✓ id is unique across all vehicles
- ✓ name is 1–20 characters
- ✓ base.speed ∈ [150, 380]
- ✓ growth fields are non-negative (upgrades always improve)
- ✓ maxLevel ≥ 1
- ✓ unlockCost = 0 (starter) or ≥ 1000 (premium vehicles)
- ✗ If base.durability = 0 (invalid; car would break immediately)

**Tool:** TypeScript type checking + runtime validation in `ServiceLocator.ValidateVehicles()`.

---

### 2. Card Definition Schema

**File:** `src/data/cards.ts`

**TypeScript Schema:**

```typescript
export type CardEffectId = 
  | 'coinBonus'           // multiplier on coin earnings
  | 'freeFirstCrash'      // survive one crash per run without combo break
  | 'trafficReduction'    // reduce AI car density
  | 'policeIgnore'        // avoid police hazard (future)
  | ...;

export interface CardDef {
  id: CardEffectId;       // unique effect identifier
  name: string;           // display name; 1–30 chars
  description: string;    // UI flavor text
  rarity: Rarity;         // 'common' | 'rare' | 'epic' | 'legendary'
  icon: string;           // texture key (emoji or glyph)
  accent: number;         // hex color
  value: number;          // effect magnitude at level 1; interpretation depends on effect
  valueGrowth: number;    // per-level additive or multiplicative bonus
  maxLevel: number;       // max upgrade level; range [1, 20]
}
```

**Example Entry:**

```typescript
{
  id: 'coinBonus',
  name: 'Money Magnet',
  description: 'Earn +50% more coins per delivery.',
  rarity: 'rare',
  icon: '💰',
  accent: 0xffdd00,
  value: 1.5,            // 1.5× coins at level 1
  valueGrowth: 0.1,      // +0.1× per level (level 2 = 1.6×, level 3 = 1.7×)
  maxLevel: 5,           // caps at 2.0× coins
}
```

**Validation Rules:**
- ✓ id matches one of the CardEffectId enum values
- ✓ name is 1–30 characters
- ✓ rarity is a valid Rarity enum
- ✓ value > 0 for all effects
- ✓ valueGrowth ≥ 0 (upgrades always improve)
- ✓ maxLevel ≥ 1
- ✗ If rarity='legendary' but unlockCost is not set (should be ≥ 50,000 coins)

**Tool:** TypeScript types + enum validation in `ServiceLocator.ValidateCards()`.

---

### 3. Theme Definition Schema

**File:** `src/data/themes.ts`

**TypeScript Schema:**

```typescript
export interface ThemeDef {
  id: string;             // unique: "modern", "europe", "beach", "tokyo", etc.
  name: string;           // display name
  sky: number;            // hex color
  ground: number;         // hex color
  road: number;           // hex color
  roadLine: number;       // hex color (lane markings)
  buildingPalette: number[]; // array of 4–6 hex colors for procedural buildings
  accent: number;         // highlight color
  hazardBias: number;     // 0..1 multiplier on hazard density; 0.5 = normal, 1.5 = chaotic
}
```

**Example Entry:**

```typescript
{
  id: 'modern',
  name: 'Modern City',
  sky: 0x87ceeb,
  ground: 0x90ee90,
  road: 0x404040,
  roadLine: 0xffff00,
  buildingPalette: [0xff6b6b, 0x4ecdc4, 0xffd93d, 0x95e1d3, 0xf38181],
  accent: 0xffd93d,
  hazardBias: 1.0,       // normal traffic density
}
```

**Validation Rules:**
- ✓ id is unique
- ✓ name is 1–20 characters
- ✓ all color values are valid hex (0x000000 to 0xffffff)
- ✓ buildingPalette has 4–8 colors
- ✓ hazardBias ∈ [0.3, 3.0] (can't be extreme)

**Tool:** TypeScript validation in `ServiceLocator.ValidateThemes()`.

---

### 4. Order Kind Definition Schema

**File:** `src/data/orderKinds.ts`

**TypeScript Schema:**

```typescript
export interface OrderKindDef {
  id: string;             // unique: "pizza", "coffee", "sushi"
  name: string;           // display name
  baseReward: number;     // base coins before multiplier; range [50, 200]
  icon: string;           // emoji or texture key
  vipIcon: string;        // emoji for VIP variant (e.g. "🍕" vs "👑🍕")
}
```

**Example Entries:**

```typescript
[
  { id: 'pizza', name: 'Pizza', baseReward: 100, icon: '🍕', vipIcon: '👑🍕' },
  { id: 'coffee', name: 'Coffee', baseReward: 80, icon: '☕', vipIcon: '👑☕' },
  { id: 'sushi', name: 'Sushi', baseReward: 120, icon: '🍣', vipIcon: '👑🍣' },
]
```

**Validation Rules:**
- ✓ id is unique
- ✓ baseReward ∈ [50, 200]
- ✓ icon is a valid emoji or texture key

**Tool:** TypeScript validation in `ServiceLocator.ValidateOrderKinds()`.

---

## Content Pipeline

```
     ┌─────────────────────────────────────────┐
     │  Author (Engineer / Designer in IDE)    │
     │  Edit src/data/vehicles.ts, etc.        │
     └────────────┬────────────────────────────┘
                  │
     ┌────────────▼────────────────────────────┐
     │  Validate (TypeScript + Runtime)        │
     │  - Type check (tsc --noEmit)            │
     │  - Range checks (0 ≤ speed ≤ 380)       │
     │  - Enum validation (rarity must be      │
     │    'common' | 'rare' | 'epic' |         │
     │    'legendary')                         │
     │  - Referential integrity (all vehicle   │
     │    IDs referenced by player profile     │
     │    must exist in vehicles.ts)           │
     └────────────┬────────────────────────────┘
                  │
                  ├─→ [FAIL] → Error in build log
                  │           (tsc, vite build)
                  │
     ┌────────────▼────────────────────────────┐
     │  Transform / Bundle (Vite)              │
     │  - Compile TS to JS                     │
     │  - Tree-shake unused data               │
     │  - Inline into game bundle              │
     └────────────┬────────────────────────────┘
                  │
     ┌────────────▼────────────────────────────┐
     │  Load at Runtime (Boot Scene)           │
     │  - ServiceLocator.RegisterService(      │
     │      'vehicles', vehicleList)           │
     │  - Cache in memory                      │
     └────────────┬────────────────────────────┘
                  │
     ┌────────────▼────────────────────────────┐
     │  Hot-Reload (Dev Mode)                  │
     │  - Vite HMR: edit src/data/vehicles.ts  │
     │  - Reload in 100–500ms                  │
     │  - Re-register services                 │
     │  - No full rebuild needed                │
     └─────────────────────────────────────────┘
```

**Stages:**
1. **Author:** Edit TypeScript files in IDE (familiar for engineers; easy for designers to learn).
2. **Validate:** TypeScript compiler + runtime schema validation at boot.
3. **Build:** Vite bundles data into game JS.
4. **Load:** Boot scene registers data in ServiceLocator.
5. **Runtime:** Game reads data via ServiceLocator queries.
6. **Hot-reload (dev):** Vite HMR triggers data reload without full rebuild.

---

## Balance.ts (Centralized Tuning)

**File:** `src/core/Balance.ts`

All tuning numbers for gameplay are defined here, not sprinkled through code:

```typescript
export const Run = {
  startTime: 45,         // starting run clock
  timePerDelivery: 7,    // +seconds per successful delivery
  maxTime: 60,           // hard cap on run time
} as const;

export const Scoring = {
  baseReward: 100,       // coins per delivery
  comboCap: 8,           // max combo multiplier
  distanceBonus: 6,      // coins per 100px
} as const;

export const Difficulty = {
  rampDeliveries: 12,    // deliveries to reach max difficulty
  orderTimeStart: 22,    // order time limit at difficulty 0
  orderTimeMin: 12,      // order time limit at difficulty 1
  vipChanceStart: 0.08,  // VIP spawn rate at difficulty 0
  vipChanceMax: 0.30,    // VIP spawn rate at difficulty 1
} as const;
```

**Validation:**
- All values are `as const` (TypeScript const assertion) → ensures type inference.
- Ranges are enforced by comments; runtime assertions in Balance unit tests.

**How to Tune:**
1. Edit the value in Balance.ts.
2. Save.
3. Vite HMR reloads in 100ms.
4. Play a run; observe the change.

---

## Validation at Author & Build Time

### Author Time (TypeScript Strict Mode)
```bash
npm run typecheck  # tsc --noEmit
```
Catches: wrong types, missing fields, enum mismatches.

### Build Time (Vite)
```bash
npm run build      # vite build
```
Runs: tsc validation + Vite compilation. Fails if:
- Type errors
- Bad Balance values (should be asserted in type)
- Missing required fields in data objects

### Runtime (Boot Scene)
```typescript
async function boot() {
  const vehicles = await import('@/data/vehicles');
  const cards = await import('@/data/cards');
  
  // Validate at runtime
  for (const v of vehicles.VEHICLES) {
    if (v.speed < 150 || v.speed > 380) {
      throw new Error(`Vehicle ${v.id}: speed out of range`);
    }
  }
  
  ServiceLocator.RegisterService('vehicles', vehicles.VEHICLES);
  ServiceLocator.RegisterService('cards', cards.CARDS);
}
```

---

## Data Ownership & Modification

| Data | Owner | Mutate How | Persist How |
|---|---|---|---|
| vehicles.ts | Game Designer (read-only in code) | Edit file; rebuild + redeploy | Committed to git |
| cards.ts | Game Designer | Edit file; rebuild + redeploy | Committed to git |
| themes.ts | Game Designer | Edit file; rebuild + redeploy | Committed to git |
| Balance.ts | Game Designer | Edit file; Vite HMR reload | Committed to git |
| PlayerProfile (player level, coins) | ProfileStore (code) | UpdateCoins(), SelectVehicle() | SaveManager → localStorage |
| RunState (this run's economy) | RunState (code) | OnDelivered(), OnCrash() | Not persisted (reset each run) |

**Key rule:** Content data (vehicles, cards) is read-only at runtime. Player data (profile, run state) is mutable via well-defined commands.

---

## Validation Checklist

- [x] Every externalized data type has a documented TypeScript schema with types and ranges.
- [x] Authoring tool is TypeScript (familiar for engineers, learnable for designers).
- [x] Validation runs at build time (tsc, Vite) and fails the build if data is bad.
- [x] Referential integrity is checked (all vehicle IDs must exist; no dangling references).
- [x] Hot-reload is supported (dev mode via Vite HMR; designers tune and see changes in 100ms).
- [x] Bad data is caught before reaching runtime (strict mode; no silent defaults).
- [x] Data format is versioned (PlayerProfile `version` field).
- [x] Non-technical designers can author content after brief onboarding (edit TypeScript objects + rebuild).

## Status

**Complete.** Delivery Rush MVP is fully data-driven. All tuning lives in Balance.ts; all content in src/data/. Three.js rewrite will preserve this pipeline (data files are engine-agnostic).
