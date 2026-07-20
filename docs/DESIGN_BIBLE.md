# DELIVERY RUSH — Design & Technical Bible

> Single source of truth for engineers, designers, and artists building **Delivery Rush**.
> Distilled from "The Book of Game" framework and applied to concrete decisions for THIS game.
> Stack: **Phaser 3 + TypeScript + Vite**, mobile-first, portrait, 60 FPS.
> Status: Pre-production spec. Version 1.0. Owner: Game Lead.

---

## 1. Foundations

### 1.1 Executive Summary

Delivery Rush is a polished casual arcade courier game where the player's vehicle **auto-drives forward** and is steered with **only three large touch buttons** (Turn Left / Go Straight / Turn Right). The player races to chain deliveries across a **procedurally generated top-down city** before a timer expires. Chaining deliveries builds a **score/coin combo multiplier**; missing one breaks it. Sessions last **30–90 seconds**. Around the core loop sits a full free-to-play meta economy (garage, ability cards, currencies, battle pass, missions, events) and an interface-abstracted online layer (leaderboards, tournaments, cloud save) that ships as mocks.

| Attribute | Value |
|---|---|
| Genre | Casual arcade / endless courier / high-score chaser |
| Platforms | Mobile web (primary), packaged mobile (secondary), desktop web (dev/QA) |
| Orientation | Portrait, locked |
| Target Audience | Ages 4–18, casual + score-chasers |
| Session Length | 30–90 seconds |
| Monetization | F2P, cosmetic + convenience, rewarded ads, **no pay-to-win** |
| Tech | Phaser 3, TypeScript, Vite, WebGL |
| Frame Target | 60 FPS on mid-range 2020+ phones; 30 FPS floor on low-end |

**Comparable titles:** *Crazy Taxi* (deliver-fast fantasy, combo chains) meets *Crossy Road* (one-more-run pick-up-and-play, snap input, cosmetic collection) meets *Subway Surfers* (juicy F2P meta, endless procedural, weekly events).

### 1.2 Vision

> **Delivery Rush makes the player feel like a hyper-competent city courier who threads impossible traffic on pure instinct — turning a three-button interface into a deep dance of timing and routing, where every perfect chain of deliveries feels like a small heist pulled off flawlessly.**

Success means: a first-timer understands the game in 10 seconds, a returning player is chasing "one more run" to beat their combo, and both leave feeling *skilled*, not lucky.

**Anti-vision (what Delivery Rush is NOT):**
- Not a realistic driving sim — physics serve *feel*, not simulation.
- Not a twitch bullet-hell — difficulty comes from routing decisions, never from unreadable chaos.
- Not pay-to-win — money and ads buy cosmetics, time, and convenience, never raw score power.
- Not a long-session game — no run should demand more than 90 seconds of unbroken attention.

### 1.3 Core Values (ranked — higher wins conflicts)

| # | Value | Priority | Manifestation | Cost accepted |
|---|---|---|---|---|
| 1 | **Readability first** | HIGH | City, traffic, nav arrow, and the "correct" turn are legible at a glance and in motion. Semantic color + shape redundancy. | We reject visually dense "realistic" art; we cap on-screen actors. |
| 2 | **Game feel / responsiveness** | HIGH | Input→visual response < 50 ms. Every action gets layered visual+audio+haptic feedback. Snappy easing. | Extra engineering on tweening, pooling, and input buffering. |
| 3 | **Fair, honest challenge (no P2W)** | HIGH | Difficulty is transparent and skill-based; upgrades help but skill dominates; failure states are always explained. | We forgo aggressive monetization revenue. |
| 4 | **Age-appropriate & accessible (4–18)** | MEDIUM | Colorblind-safe, large touch targets, no reading gates, no FOMO dark patterns, gentle onboarding. | Some UI real estate spent on clarity over density. |
| 5 | **Data-driven, live-service scalable** | MEDIUM | Vehicles, cards, themes, missions, orders defined as data; systems event-driven and swappable for future online. | Upfront pipeline/schema cost. |

### 1.4 Gameplay Pillars (behavioral, lock in pre-production)

1. **Snap Steering** — Deep control mastery from a 3-button interface: reading upcoming intersections and committing turns at the right instant.
2. **Combo Chaining Under Pressure** — The multiplier is the heart. Players make risk/reward routing choices to keep the chain alive against the clock.
3. **Readable Procedural Cities** — Every run is a fresh, seeded layout that is nonetheless instantly parseable; the challenge is navigation, never confusion.
4. **Juice as a Feature** — Screen shake, particles, floating rewards, tire screech, and haptics make every delivery feel like a win.
5. **Escalating Fair Chaos** — Traffic, weather, police, and road work ramp difficulty over the run through readable, telegraphed pressure — one new variable at a time.

Feature filter: *a proposed feature must serve ≥1 pillar and undermine none.* Example rejections: free-roam open world (undermines Pillar 5's tight escalation and 30–90s sessions); manual accelerator pedal (undermines Pillar 1's three-button purity).

---

## 2. Core Gameplay Loop & Game Flow

### 2.1 Micro Loop (2–4 seconds, ~20–40× per run)

The steering decision is the atomic unit.

```
[See road + nav arrow + next intersection] → [Choose L / Straight / R]
        ↑                                              ↓
        └──── [Feedback: drift, screech, camera, combo tick] ← [Car turns / continues]
```

1. **Observe:** Player reads the car's lane, the animated **nav arrow** pointing toward the active objective, and the upcoming intersection geometry + hazards.
2. **Decide:** Pick a button. "Go Straight" is the implicit default (auto-drive continues).
3. **Act:** Tap Left/Right to commit a turn onto the cross-street when inside the intersection's **turn window**; tap Straight to cancel a pending turn and recenter to lane.
4. **Process:** Car steers with arcade easing; collision checks against traffic/obstacles; proximity checks against pickup/dropoff nodes.
5. **Feedback (< 100 ms):** Tire screech SFX, drift particles, subtle camera lean, button press flash + haptic pulse.
6. **New state:** New heading, updated distance-to-objective, possibly a pickup/drop trigger.

Feedback timing budget: input→visual 0–50 ms, turn animation 150–300 ms ease-out, camera lean settle 100–200 ms.

### 2.2 Macro Loop — "A Run" (30–90 seconds)

```
[Countdown 3-2-1] → [Deliver loop: pickup → route → drop → combo++] → [Timer expires] → [Results]
     (2s)              (repeat: each delivery 6–15s)                     (0s)            (screen)
```

Second-by-second delivery cycle:
- **t+0s Pickup phase:** An **order card** shows a restaurant marker; nav arrow points to it. Player drives to the pickup node (enter its radius) → "Order picked up" chime, cargo icon fills.
- **Route phase:** Order card flips to a **dropoff** marker with a per-order sub-timer (e.g., 12s). Nav arrow re-points to the customer. Player routes through traffic.
- **Deliver phase:** Enter dropoff radius before the sub-timer expires → **delivery success**: coins burst, floating "+120 x3", combo increments, screen shake, success jingle.
- **Chain:** Next order auto-spawns immediately; combo persists.
- **Miss:** Sub-timer expires OR a hard crash → combo resets to 0, "Combo Lost" sting, small time penalty. The run's master timer continues.
- **Run end:** Master timer (30–90s depending on city tier) hits 0 → freeze, tally, transition to Results.

Failure conditions (all readable): master timer expiry (run ends, always scored), order sub-timer expiry (combo break), crash exceeding durability (spin-out stun ~1.2s + combo break). **No instant "game over" from a single crash** unless durability is depleted — respecting "punishment must match the offense."

### 2.3 Meta Loop (days/weeks)

| Milestone | Runs to reach | Unlock / change | Motivation |
|---|---|---|---|
| Runs 1–3 | first session | Core loop taught, first vehicle, 3 starter cards | Learning / competence |
| Runs 4–15 | day 1 | First vehicle upgrade, 2nd city theme, daily missions | Progress / novelty |
| Runs 15–40 | days 2–7 | Rare/Epic cards, garage tiers, battle pass tiers | Mastery / collection |
| Runs 40+ | week 2+ | Legendary cards, all themes, weekly events, leaderboards | Prestige / competition |

Return incentives (intrinsic-first): beat your combo/high score, complete daily missions, chase card collection completion, weekly event leaderboard. Coercive hooks (streaks/FOMO) are deliberately minimized per Core Value 3 and the 4–18 audience.

### 2.4 Game Flow / State Machine

```
BOOT → MAIN MENU ⇄ {GARAGE, CARDS, SHOP, BATTLEPASS, MISSIONS, ACHIEVEMENTS, LEADERBOARD, SETTINGS, PROFILE}
                          │
                     [Play] → PRE-RUN LOADOUT (vehicle + 3 cards + theme)
                          │
                        RUN (Gameplay) ⇄ PAUSE
                          │
                       RESULTS → {Retry → PRE-RUN, Home → MAIN MENU}
```

Transition budgets: menu tap < 100 ms; screen fade 250–400 ms; scene/city load < 1.5 s (streamed); Results→Retry < 1 s to re-enter loadout. Every screen has ≥2 exits; no dead ends. Core loop reachable in ≤2 taps from Main Menu (Play → Go).

---

## 3. Player Psychology, Rewards & Retention

### 3.1 Dopamine & reward loops (applied)

| Loop | Cadence | Reward | Feedback | Randomness |
|---|---|---|---|---|
| Micro (steer/near-miss) | every 2–4 s | combo tick, near-miss slow-mo flash | screech, particle, haptic | none |
| Delivery | every 6–15 s | coins × multiplier, floating text | shake, jingle, coin burst | none (deterministic) |
| Run end | every 30–90 s | coin payout, XP, mission progress | tally count-up, star rating | none |
| Session/meta | daily | chest, battle pass tier, card shards | chest-open reveal | **bounded, disclosed** |

- **Anticipation over payoff:** the combo meter visibly *charges* toward the next multiplier tier; the coin count-up on Results animates upward. Near-misses trigger a brief (120 ms) slow-mo + spark to reward daring routing.
- **Loss aversion, ethically:** the combo is the thing you fear losing. It stings (audio sting + meter shatter) but is fully recoverable next delivery; coins already banked are never taken away.
- **Reward schedule:** gameplay rewards are **fixed-ratio** (skill in → coins out), keeping it honest. Only cosmetic chests use bounded variable rewards with **disclosed odds and a pity timer** (see §5.10). Variable rewards never gate power or progression.

### 3.2 Motivation targets (Self-Determination Theory)

- **Autonomy (4/5):** choose vehicle, 3-card loadout, and city theme before each run; multiple valid routes to each customer.
- **Competence (5/5):** immediate, legible feedback; skill dominates outcome; combo is a live skill meter.
- **Relatedness (3/5):** leaderboards, country/friends rankings, weekly tournaments (mocked now, real later); shareable high scores.

### 3.3 Retention (D1/D7/D30 targets & hooks)

Targets (arcade high-score genre): **D1 45–55%, D7 22–30%, D30 10–15%.** Intrinsic hooks: mastery (beat combo), collection (cards/skins), variety (8 themes). Catch-up: missed daily missions rotate, no permanent loss; battle pass has generous free track and no punishing streaks. **No FOMO language in onboarding.**

---

## 4. Difficulty Philosophy & Curve

**Philosophy:** Skill-based and transparent. Difficulty comes from **routing decisions and reaction to telegraphed pressure**, never from hidden rules or unfair RNG. Every failure gives a clear cause ("Order expired", "Crashed", "Time's up"). One new pressure variable is introduced at a time. Extraneous cognitive load → 0 (clean HUD, ≤4 tracked items); germane load (routing, timing) → high.

### 4.1 Within-run ramp (a single 30–90s run)

The run's `intensity` (0→1) scales linearly with elapsed time and drives spawn parameters.

| Run phase | % of run | Traffic density | Order sub-timer | Added pressure | Target success |
|---|---|---|---|---|---|
| Warmup | 0–20% | Low | Generous (14s) | none | 95% |
| Build | 20–50% | Medium | Standard (12s) | +1 hazard type (road work) | 85% |
| Peak | 50–85% | High | Tight (10s) | + police / weather | 65% |
| Finale | 85–100% | High + | Tight (9s) | double-value VIP orders spawn | 55% |

### 4.2 Across-session / city-tier ramp

City themes act as difficulty tiers via data parameters (not new code): `baseTrafficDensity`, `weatherIntensity`, `intersectionComplexity`, `runDuration`. Progression order (soft-gated by player level): Modern City → Europe → Beach → Tokyo → Snow → Desert → Dubai → Cyberpunk (hardest). Player-facing "difficulty" is a themed choice, preserving autonomy; hard themes are optional, never required for progression.

### 4.3 Difficulty levers (data-driven knobs)

`trafficDensity`, `orderTimeLimit`, `hazardTypesEnabled`, `weatherIntensity` (grip/visibility), `intersectionSpacing`, `policeAggro`. Each raises exactly one pressure source. Never combined blindly in one step.

---

## 5. Technical Design

### 5.1 Target platform & constraints

| Platform | Priority | Min spec | Target |
|---|---|---|---|
| Mobile web (Chrome/Safari, WebGL2) | Primary | 2020+ mid phone, 4 GB RAM | 60 FPS, < 25 MB initial download |
| Low-end mobile web | Supported floor | 2018 phone, 3 GB RAM | 30 FPS floor, graceful particle/quality scaling |
| Desktop web | Dev/QA | any WebGL2 browser | 60 FPS, keyboard input for testing |
| Packaged (Capacitor/WebView) | Secondary/future | same as mobile | reuse web build |

**Hard constraints:** portrait only; touch primary (three ≥ 1.5 cm buttons in thumb reach); safe-area insets respected (notches, gesture bars); offline-capable core (no network required to play).

### 5.2 Tech stack rationale (ADR summary)

| Criterion (weight) | Phaser 3 + TS + Vite | Why chosen |
|---|---|---|
| Fit to genre (5) | 5 | 2D top-down arcade with sprites, tweens, arcade physics, particles — Phaser's core strengths. |
| Team familiarity (4) | 5 | Brief mandates it; huge community, docs, examples. |
| Iteration speed (4) | 5 | Vite HMR = sub-second reloads; TS catches errors early. |
| Portability (4) | 4 | One WebGL build runs web + WebView wrappers. |
| Performance (5) | 4 | WebGL batching + Arcade Physics handle target actor counts at 60 FPS. |

**Decision:** Phaser 3 (latest stable, WebGL renderer) + TypeScript (strict) + Vite. Arcade Physics (AABB) — **not** Matter.js — because we need cheap, deterministic-enough top-down collisions, not rigid-body simulation. **Revisit triggers:** if actor counts force > 16.6 ms physics, or if we need slope/rotated-body collisions.

### 5.3 Non-functional requirements (NFR register)

| ID | Category | Metric | Target | Priority | Verify |
|---|---|---|---|---|---|
| NFR-01 | Performance | Sustained FPS | 60 on mid phone, ≥30 floor | P1 | Phaser FPS meter + device soak |
| NFR-02 | Responsiveness | Input→visual | < 50 ms (< 100 ms hard cap) | P1 | Frame-count instrumentation |
| NFR-03 | Load | Boot→playable | < 3 s cold, < 1.5 s run start | P1 | Timer from boot |
| NFR-04 | Memory | Peak JS heap + textures | < 150 MB mobile | P1 | Chrome mem profiler |
| NFR-05 | Draw calls | Per frame in-run | < 80 | P2 | WebGL debug / spector.js |
| NFR-06 | Stability | Crash-free sessions | > 99.5% | P1 | error telemetry hook |
| NFR-07 | Scalability | Simultaneous active actors | ≤ 60 (traffic+coins+FX) pooled | P2 | stress spawn test |
| NFR-08 | Accessibility | Colorblind-safe, remap, reduced-motion | 100% semantic redundancy | P1 | simulator + manual |

Frame budget (16.6 ms): Input 0.5 · Simulation/Game logic 4.0 · Physics 3.0 · Spawning/Procedural 1.5 · Rendering CPU 4.0 · Particles/FX 1.5 · Audio 0.5 · UI 1.0 · **Headroom 0.6**.

### 5.4 Systems architecture overview

Event-driven, component-based, single-source-of-truth ownership. Systems communicate via a global **EventBus** (Phaser events) for one-to-many, and direct queries for single facts. Dependency graph is acyclic.

| System | Responsibility | Owns | Talks to (via) |
|---|---|---|---|
| **InputSystem** | Map touch/keys → 3 steering actions + meta | current action state | EventBus → VehicleController |
| **VehicleController** | Apply steering, speed, drift to player car | player transform, speed, heading, durability | Physics, EventBus |
| **CityGenerator** | Seeded procedural city, streamed chunks | road graph, lots, node list, seed | ObjectPools, EventBus |
| **TrafficSystem** | Spawn/despawn NPC cars & pedestrians, simple FSM AI | active NPC actors | ObjectPools, Physics |
| **HazardSystem** | Road work, accidents, police, weather | active hazards, weather state | EventBus, difficulty params |
| **OrderSystem** | Generate/track orders, pickup/drop, sub-timers | active order(s), cargo state | EventBus |
| **ScoreSystem** | Combo, multiplier, coins-this-run, score math | combo, multiplier, runCoins, runScore | EventBus |
| **DifficultySystem** | Compute `intensity`, feed spawn params | intensity curve | reads run timer; feeds Traffic/Hazard |
| **CardSystem** | Apply equipped card effects to run modifiers | active run modifiers | EventBus (subscribes to all) |
| **EconomyManager** | Coins/Gems ledger, upgrades, purchases | currency balances, owned items | SaveService |
| **ProgressionManager** | XP, level, battle pass, missions, achievements | progression state | SaveService, EventBus |
| **AudioManager** | Play/duck SFX & music by event | channels, volumes | EventBus (subscriber) |
| **UIManager / HUD** | Render menus + in-run HUD | widget state | reads Score/Order/Vehicle |
| **SaveService** | Persist/load, versioned, atomic | serialized save | localStorage / cloud stub |
| **ServiceLocator** | Wire mock/real online services | service refs | Leaderboard/Cloud/Profile interfaces |

Rule: no system reads another's private state; health/combo/coins each have exactly one owner. UI and Audio are pure subscribers.

### 5.5 Game state & data model (persistent vs runtime)

**Runtime-only (never saved):** car transform/velocity, NPC actors, particles, camera shake, active order timers, combo counter, current-run coins, weather visuals, procedural chunk instances.

**Persistent (saved):** profile, currencies, owned/upgraded vehicles, owned/upgraded cards, equipped loadout, unlocked themes, progression (level/XP), battle pass tier & claimed, mission/achievement state, high scores, settings, daily-shop seed/date.

```ts
// Persistent save schema (v1)
interface SaveGameV1 {
  version: 1;
  timestamp: string;              // ISO
  checksum: string;               // integrity
  profile: { id: string; name: string; avatarId: string; countryCode: string; };
  currencies: { coins: number; gems: number; };
  vehicles: Record<VehicleId, { owned: boolean; upgrades: VehicleStatLevels; skinId?: string; }>;
  cards: Record<CardId, { owned: boolean; level: number; shards: number; }>;
  loadout: { vehicleId: VehicleId; cardIds: [CardId, CardId, CardId]; themeId: ThemeId; };
  unlockedThemes: ThemeId[];
  progression: { level: number; xp: number; };
  battlePass: { seasonId: string; tier: number; premium: boolean; claimed: number[]; };
  missions: Record<MissionId, { progress: number; claimed: boolean; date: string; }>;
  achievements: Record<AchievementId, { progress: number; unlocked: boolean; }>;
  stats: { highScore: number; bestCombo: number; totalDeliveries: number; runs: number; };
  settings: SettingsData;
  dailyShop: { seedDate: string; };
}
type VehicleStatLevels = Record<VehicleStat, number>; // 0..maxLevel per stat
```

Derived values (level from XP, effective stats from base+upgrades) are computed at load, never stored, so tuning changes don't corrupt saves.

### 5.6 Game loop & scene/FSM design

- **Timestep:** **Variable timestep, clamped** (`delta` capped at ~33 ms). Phaser drives update; we scale movement by `delta`. We do **not** require lockstep determinism (single-player). City generation uses a **seeded PRNG** for reproducible layouts (shareable seeds), but simulation is not rollback-deterministic.
- **Phase order per frame:** Input poll → Update (difficulty → spawns → AI → vehicle → physics resolve → order/score checks) → Render (read-only) → Audio dispatch.
- **Scenes (Phaser.Scene as top-level FSM states):**

```
BootScene → PreloadScene → MenuScene ⇄ (GarageScene, CardsScene, ShopScene, MetaScene[tabs])
                                       ⇄ LoadoutScene → GameScene (+ HudScene overlay, + PauseScene overlay)
                                                         → ResultsScene
```

`GameScene` runs gameplay; `HudScene` is a parallel overlay scene (kept separate so HUD never shares a camera/shake with the world). `PauseScene` launches on top and pauses `GameScene` + `HudScene`. Each scene has explicit `create`/`shutdown` that subscribe/unsubscribe EventBus listeners (no leaks). An internal **run FSM** inside GameScene: `Countdown → Playing → RunEnding → HandoffToResults`.

### 5.7 Key algorithms & formulas

All ⚙️ values are data-driven (config), not hard-coded.

**Score / combo:**
```
name: Delivery Reward
vars: baseValue ⚙️ (per order, e.g. 100), combo (int ≥0),
      subTimerRemaining (s), subTimerLimit (s), cardCoinMult ⚙️ (1.0..1.5)
comboTier(combo):  combo<2 →1.0 | <4 →1.5 | <7 →2.0 | <12 →3.0 | else →5.0   (cap ⚙️ 5x)
timeBonus = 1 + 0.5 * (subTimerRemaining / subTimerLimit)                     // 1.0..1.5, faster = more
reward = round(baseValue * comboTier(combo) * timeBonus * cardCoinMult)
example: base 100, combo 5 (→2.0x), delivered with 60% time left (→1.3x), no card:
         100 * 2.0 * 1.3 * 1.0 = 260 coins ; combo → 6
on miss/crash: combo = 0
runScore += reward ; runCoins += reward
```

**Coin economy — upgrade cost curve (power law for felt progression):**
```
name: Vehicle Stat Upgrade Cost
upgradeCost(level) = round(baseCost ⚙️ * growth ⚙️^level)   // baseCost 120, growth 1.55
levels: 0→120, 1→186, 2→288, 3→446, 4→692 ...  (8 levels/stat, 8 stats)
```

**Run payout & XP:**
```
runCoins already accumulated in-run (banked per delivery, tamper-checked at Results)
runXP = round( deliveries * 10 ⚙️ + bestComboThisRun * 5 ⚙️ )
level from XP: xpForLevel(n) = round(200 ⚙️ * n^1.5)   // soft, ever-slowing
```

**Card shard → upgrade:**
```
cardUpgradeShards(level) = 5 ⚙️ * (level+1)   // duplicates convert to shards; capped rarity levels
```

**Procedural city generation (seeded, chunk-streamed):**
```
name: City Chunk Generation
inputs: seed, themeParams{intersectionSpacing, blockDensity, decorSet}, chunkCoord
process:
  1. PRNG = mulberry32(hash(seed, chunkCoord))            // deterministic per chunk
  2. Lay road grid for chunk: cells spaced by intersectionSpacing ⚙️;
     with prob pRemove ⚙️ drop a segment → creates parks/plazas (variety) while keeping graph connected (check).
  3. For each block (lot) between roads: pick building footprint from theme set weighted by blockDensity ⚙️.
  4. Tag road-adjacent lots as candidate nodes; OrderSystem samples pickup/drop from candidates
     within routable distance band [minDist, maxDist] ⚙️ of the car.
  5. Scatter theme decor (trees, signs, snow, neon) — pooled sprites, culled off-camera.
outputs: chunk {roadGraph, colliders, nodeCandidates, decorInstances}
streaming: keep a 3x3 chunk window around the camera; generate ahead, recycle behind into pools.
complexity: O(cells per chunk); target < 1.5 ms amortized (generate at most 1 chunk/frame).
```

**Difficulty intensity:**
```
intensity(t) = clamp(t / runDuration, 0, 1)     // t = elapsed run seconds
trafficDensity = lerp(minD ⚙️, maxD ⚙️, intensity) * themeTrafficMult ⚙️
orderTimeLimit = lerp(14 ⚙️, 9 ⚙️, intensity)
weatherIntensity ramps in only after intensity > 0.5 (one variable at a time)
```

**Traffic spawning (interval + budget):**
```
name: Traffic Spawn
every spawnInterval = lerp(1.2s ⚙️, 0.4s ⚙️, intensity):
  if activeNPCs < maxNPCs ⚙️(≈24) and free lane exists ahead of camera:
     spawn pooled NPC on a road cell just outside camera, heading along its lane.
NPC AI = tiny FSM {Cruise → SlowForObstacle → Stop(red light) → Cruise}; obey lane, no player targeting.
despawn NPCs > cullDistance ⚙️ behind camera → return to pool.
```

**Near-miss detection (juice):**
```
if distance(player, NPC) < nearMissRadius ⚙️ and relativeSpeed high and no collision this frame:
   emit 'nearMiss' → 120ms time-scale 0.85 dip, spark FX, +small combo-hold grace, "NICE!" popup.
```

### 5.8 Data-driven design

All content is JSON validated against schemas at build time (fail build on bad data / dangling refs). Hot-reloadable in dev.

```ts
interface VehicleDef { id: string; name: string; sprite: string; rarity: Rarity;
  baseStats: Record<VehicleStat, number>;   // speed, accel, handling, braking, durability, fuel, nitro, cargo
  statCaps: Record<VehicleStat, number>; priceCoins?: number; priceGems?: number; skins: string[]; }

interface CardDef { id: string; name: string; icon: string; rarity: Rarity;
  effect: CardEffectType;                    // POLICE_IGNORE | HIGHWAY_SPEED | FUEL_PLUS | COIN_BONUS |
                                             // TRAFFIC_REDUCTION | FREE_CRASH | VIP_SPAWN | DRONE | SLOWMO | COIN_MAGNET
  magnitudePerLevel: number[]; maxLevel: number; }

interface ThemeDef { id: string; name: string; palette: PaletteRef; decorSet: string[];
  params: { intersectionSpacing: number; blockDensity: number; trafficMult: number;
            weatherType: 'none'|'snow'|'rain'|'sand'|'neon'; runDuration: number; unlockLevel: number; } }

interface MissionDef { id: string; text: string; metric: MissionMetric; target: number;
  rewardCoins: number; rewardGems?: number; xp: number; }

interface OrderTemplate { id: string; baseValue: number; vip: boolean; cargoType: string; }
```

`VehicleStat = 'speed'|'accel'|'handling'|'braking'|'durability'|'fuel'|'nitro'|'cargo'`.
`Rarity = 'common'|'rare'|'epic'|'legendary'`.

### 5.9 Input abstraction (the three-button control)

Gameplay code never reads raw input — it reads **actions**. Layer: raw (touch/key) → normalized → action → gameplay.

| Action | Intent | Type | Touch | Keyboard (dev) |
|---|---|---|---|---|
| `steer_left` | Turn left at next intersection / lane-shift left | Digital (press) | Left button | ← / A |
| `steer_straight` | Cancel pending turn, recenter to lane | Digital | Center button | ↑ / W |
| `steer_right` | Turn right | Digital | Right button | → / D |
| `nitro` (optional/meta) | Consume nitro for burst | Digital hold | auto-trigger or 4th small button | Space |
| `pause` | Pause run | Digital | HUD pause icon | Esc |

Feel params (data-driven, not hardcoded): `turnWindowMs` (grace before/after intersection center a turn is accepted, ~180 ms buffer), `inputBufferFrames` (queue a turn tap slightly early, ~6 frames), `driftEaseMs` (150–300), `laneSnapStrength`. `InputSystem` emits `on('action', ...)`; `VehicleController` consumes. Rebinding/persistence supported through the same map (keys for dev, on-screen layout swap for accessibility — e.g., left/right handed button mirroring).

### 5.10 Persistence / save design

- Storage: `localStorage` key `deliveryrush.save` (web), abstracted behind `SaveService` so a WebView/native or cloud backend swaps in unchanged.
- **Versioned** from v1 (`version` field + migration chain `migrate_v1_v2(...)`).
- **Atomic write:** serialize → write to `deliveryrush.save.tmp` → validate parse+checksum → promote to live key; keep one `.bak`. On corrupt load, offer backup.
- **Integrity:** append a checksum/HMAC (client-side speed bump, not anti-cheat); banked run coins validated at Results against delivery events.
- **Autosave triggers:** run end, purchase, upgrade, mission claim, settings change (never mid-run per-frame).
- **Cloud:** `ICloudSaveService` with last-write-wins + conflict prompt stub; MockCloudSave writes to a second localStorage namespace to exercise the code path.

### 5.11 Networking abstraction (mock now, real later)

**No hard-coded networking.** All online features sit behind interfaces resolved by `ServiceLocator`; `MockXxx` implementations back them today.

```ts
interface ILeaderboardService {
  submitScore(mode: LeaderboardMode, score: number): Promise<void>;
  getTop(mode: LeaderboardMode, count: number): Promise<LeaderboardEntry[]>;
  getAround(mode: LeaderboardMode, playerId: string): Promise<LeaderboardEntry[]>;
}
interface ICloudSaveService { load(): Promise<SaveGameV1|null>; save(s: SaveGameV1): Promise<void>; }
interface IProfileService { get(id: string): Promise<PlayerProfile>; update(p: Partial<PlayerProfile>): Promise<void>; }
interface ITournamentService { getCurrent(): Promise<Tournament>; submit(score: number): Promise<void>; }
interface ISeasonPassService { getState(): Promise<SeasonState>; claim(tier: number): Promise<Reward>; }
// LeaderboardMode = 'global' | 'country' | 'friends' | 'weekly'
```

Mocks generate believable data (seeded fake players, country buckets, weekly reset) so UI, flows, and reward payouts are fully exercised before any server exists. Swapping to real = registering `HttpLeaderboardService` in the locator, zero gameplay changes.

### 5.12 Performance optimization (object pooling targets)

Everything spawned repeatedly is pooled; **zero allocations in the hot loop**.

| Pool | Prealloc | Max | Notes |
|---|---|---|---|
| NPC vehicles | 24 | 32 | reset transform/AI on reuse |
| Pedestrians | 12 | 20 | culled aggressively |
| Coins / pickups | 40 | 80 | magnet-card driven motion |
| Floating text ("+120 x3") | 16 | 32 | bitmap text |
| Particles (drift, burst, weather) | via Phaser emitters | — | cap emitters; reduce on low-end |
| City decor sprites | 60 | 120 | recycled across chunks |
| Road/building tiles | chunk-buffered | — | 3×3 chunk window |

Additional: single **texture atlas per theme** + shared UI atlas to keep draw calls < 80; bitmap fonts for HUD numerals; `roundPixels` on; disable physics debug in prod; quality tiers (`low` disables weather particles, halves decor, caps emitters) auto-selected by an FPS probe in the first 3 s of a run.

---

## 6. Art & UI/UX

### 6.1 Art vision & pillars

> **"Cartoon-3D toy city: chunky rounded vehicles and buildings under bright, punchy top-down light — a clean, readable diorama where the road you should take always pops."**

Art pillars (derived from gameplay pillars):
1. **Readable silhouettes** — player car, NPC cars, pickups, and hazards each have a distinct shape/color read at speed (serves Readability).
2. **Toy-like warmth** — rounded corners, soft ambient occlusion, saturated but not neon (except Cyberpunk theme) — friendly for ages 4–18.
3. **Motion is life** — everything eases, bobs, and reacts; nothing is static (serves Game Feel).
4. **Theme identity** — 8 themes are instantly recognizable by palette + decor + weather, reusing the same shape grammar.

### 6.2 Color system (dark UI + green/blue/orange accents)

**UI / semantic palette (dark theme):**

| Role | Hex | Usage |
|---|---|---|
| Background (deep) | `#0E1420` | app background, behind everything |
| Surface | `#16202E` | cards, panels |
| Surface raised | `#1E2A3A` | modals, elevated buttons |
| Border / divider | `#2A3A4E` | separators, inactive outlines |
| Primary text | `#F5F7FA` | headings, values |
| Muted text | `#9AA7B8` | labels, secondary |
| **Accent Green (GO / success)** | `#22C55E` | Go Straight button, success, health/durability, confirm |
| Green bright | `#2ED47A` | success flashes, combo-up |
| **Accent Blue (info / nav)** | `#3B82F6` | nav arrow, info, minimap, neutral CTA |
| **Accent Orange (energy / coins / action)** | `#F97316` | coins, primary CTA, nitro, emphasis |
| Coin gold | `#FFC531` | coin icon, currency values |
| Danger red | `#EF4444` | crash, danger, timer-critical, police |
| Warning amber | `#F59E0B` | order sub-timer warning |

**Rarity palette (consistent everywhere — cards, vehicles, chests):**

| Rarity | Hex | 
|---|---|
| Common | `#9AA7B8` |
| Rare | `#3B82F6` |
| Epic | `#A855F7` |
| Legendary | `#FF9F1C` (gold-orange) |

**Control-button semantic mapping:** Left = Blue `#3B82F6`, Straight = Green `#22C55E`, Right = Orange `#F97316` — three hues that are **distinguishable under deuteranopia/tritanopia** (blue/green/orange chosen deliberately; each button also carries a directional arrow glyph so meaning is never color-only). All text ≥ 4.5:1 contrast on its surface; interactive elements ≥ 3:1.

World palettes are per-theme (atmospheric, lower saturation) so the UI/semantic layer always reads on top; the nav arrow and objective markers always use the fixed semantic hues regardless of theme.

### 6.3 Typography

- **Display / titles:** a rounded geometric bold (e.g., **Baloo 2** / **Fredoka**) — toy-like, matches art. Sizes: Title 44/mobile, Heading 26, Subhead 18.
- **Body / UI:** a clean humanist sans (e.g., **Nunito** / **Inter**), Regular/Semibold. Body 14, Label 12.
- **HUD numerals:** **tabular figures**, bold, high contrast (score, coins, timer, speed) so digits don't jitter as they count. HUD numeral 20–28.
- Rendered via **bitmap fonts** for in-run HUD (perf), web fonts for menus. No baked-in text in art (localization-ready). 25% text-expansion buffer in layouts.

### 6.4 Shape language & iconography

| Entity | Silhouette | Signal |
|---|---|---|
| Player car | chunky, bright, unique skin, slight glow | "me" |
| NPC traffic | rounder/duller, muted theme colors | "avoid" |
| Pickup (restaurant) | rounded pin + food glyph, green ring | "go here to load" |
| Dropoff (customer) | rounded pin + house glyph, orange ring | "deliver here" |
| Hazard (road work/accident) | angular, striped amber/black | "danger, slow" |
| Police | angular, red/blue flashing | "threat" |
| Coin | circle, gold | "collect" |

Icon system: single 32px grid, 2px stroke or filled-consistent, uniform 4px corner radius. States: active (full), disabled (50% + desaturate), locked (lock overlay). Metaphors fixed: heart-less durability = shield icon; green = go; every meaning pairs color with a glyph.

### 6.5 UX principles (applied)

Clarity over cleverness; ≤ 100 ms feedback on every tap; consistent button placement across all screens; always an exit/back; ≤ 3–7 visible options per screen; decisions (upgrade/equip) happen in time-stopped meta screens, actions (steer) happen only in-run. Onboarding teaches through a scripted **first run** (low traffic, forgiving timer, one-time contextual hints), never a text wall. Core loop in ≤ 2 taps.

### 6.6 UI architecture & screen flow (~16 screens)

| # | Screen | Entry | Exits | Modal | State |
|---|---|---|---|---|---|
| 1 | Boot / Preloader | launch | → Main Menu | non | BOOT |
| 2 | Main Menu | boot / results / back | Play, meta tabs, Settings | non | MENU |
| 3 | Garage (vehicles) | menu | back, upgrade, equip | non | MENU |
| 4 | Cards Collection | menu | back, upgrade, equip | non | MENU |
| 5 | Loadout (pre-run) | Play | Go→Run, back | non | MENU |
| 6 | Daily Shop | menu | back, buy | non | MENU |
| 7 | Battle Pass | menu | back, claim | non | MENU |
| 8 | Missions (daily/weekly) | menu | back, claim | non | MENU |
| 9 | Achievements | menu | back, claim | non | MENU |
| 10 | Weekly Event | menu | back | non | MENU |
| 11 | Leaderboards (global/country/friends) | menu | back, tabs | non | MENU |
| 12 | Profile | menu | back, edit | non | MENU |
| 13 | Settings | menu / pause | back (save) | modal | any |
| 14 | Gameplay HUD | Loadout Go | Pause, Results | non | RUN |
| 15 | Pause | in-run pause | Resume, Restart, Home | modal | RUN |
| 16 | Results | run end | Retry→Loadout, Home | non | RESULTS |

Depth rule enforced: Settings, Pause/Resume, Play all ≤ 2 taps from context. No orphan screens; every modal has a close.

### 6.7 HUD spec (in-run)

Portrait layout, within action-safe (inner 80%), respecting safe-area insets:

| Element | Position | Content | Visibility |
|---|---|---|---|
| **Run timer** | top-center | MM:SS countdown, turns amber < 10s, red + pulse < 5s | always |
| **Coins earned** | top-left | gold coin + tabular count-up | always |
| **Combo meter** | top-right | current multiplier (x2) + charging bar to next tier + flame FX at high combo | always; shatter anim on break |
| **Order card** | upper-center, under timer | current pickup/dropoff icon, customer name/food, reward preview, **sub-timer ring** | while order active |
| **Nav arrow** | anchored to player car / screen edge | blue arrow pointing to active objective; distance meters | always in-run |
| **Minimap** (optional/low priority) | small, top-right under combo | schematic roads + objective dot | toggleable |
| **Speedometer** | bottom-center above buttons | radial gauge or bar, km/h, blurs/ticks with nitro | always |
| **Nitro gauge** | near speedometer | fills as you deliver / near-miss; glows when ready | always |
| **3 control buttons** | bottom row, thumb reach, ≥ 1.5 cm | Left (blue ◄), Straight (green ▲), Right (orange ►) — each with press flash + haptic | always |
| **Pause** | top corner, small | icon | always |

Readability tested during Peak phase (max traffic + weather): all of timer, combo, order sub-timer, nav arrow legible; feedback FX never occlude the three buttons or the nav arrow.

### 6.8 Feedback & game juice

Every action → layered reaction within 100 ms, with a **Reduced Motion** toggle.

| Event | Visual | Audio | Haptic | Camera |
|---|---|---|---|---|
| Button press | 8% scale-down + flash | tick/pop 40 ms | 30% 40 ms | – |
| Turn / drift | tire smoke particles, skid mark | screech | light | lean 100–150 ms |
| Near-miss | 120 ms slow-mo + spark, "NICE!" | whoosh | short pulse | slight zoom |
| Pickup | cargo icon fill, ring pop | pickup chime | light | – |
| Delivery success | coin burst, floating "+X ×M", green flash | success jingle rising with combo | medium double | shake 120 ms |
| Combo tier up | meter flare, flame level up | ascending sting | medium | – |
| Combo break | meter shatter, gray desaturate | descending sting | strong | – |
| Crash | debris particles, red vignette flash | crunch | strong long | shake 200 ms |
| Coin collect | sparkle, count tick | coin plink | – | – |
| Nitro | speed lines, motion blur edges, FOV punch | nitro roar | sustained | pull-back |
| Run end | freeze frame, confetti on new best | fanfare / applause | – | – |

Constraints: no flashing > 10 Hz (seizure safety); screen shake and particle intensity respect Reduced Motion (audio remains); FX budget capped per §5.12; consistency — same event always same feedback. **Haptics** via `navigator.vibrate` behind a `HapticService` with graceful no-op fallback.

### 6.9 Accessibility (ages 4–18)

- **Colorblind-safe:** button/semantic hues chosen for deuter/trit distinction; all meaning color + glyph/shape; colorblind palette toggle (protan/deuter/trit variants).
- **Motor:** large ≥ 1.5 cm buttons, left/right-handed mirror layout, tap-not-hold steering; adjustable button size; no precision timing gates beyond the forgiving turn window.
- **Cognitive / reading (young players):** icon-first UI, minimal text, no reading required to play; optional audio cues for every objective change; pause anytime; tutorial never punishes; simple language.
- **Visual:** scalable UI (75–150%), high-contrast option, reduced-motion toggle (disables shake/slow-mo/heavy particles).
- **Audio:** independent Music / SFX / UI volume sliders; every critical audio cue paired with a visual one (no sound-only information).

### 6.10 Audio direction & sound hooks

**Sonic identity:** *"Upbeat toy-city arcade: bright, bouncy, light-electronic music; punchy cartoon SFX; playful, never harsh — energy scales with the combo."* Mix hierarchy: Tier 1 critical cues (delivery, combo break, timer-critical) always cut through; Tier 2 music ducks −8 dB under Tier 1; Tier 3 ambience/engine ducks under both. Adaptive music: layered stems add intensity as `intensity(t)` and combo rise; a low-time warning stinger at ≤ 10 s.

Every required sound hook (event → cue):

| Hook | Trigger |
|---|---|
| Engine idle/rev/loop | pitch-scaled with speed |
| Tire screech / drift | turn/drift |
| Traffic ambience | NPC density (looped, spatial) |
| Pedestrian / city ambience | theme loop |
| Near-miss whoosh | near-miss event |
| Pickup chime | order picked up |
| Delivery success jingle | delivery (pitch rises with combo tier) |
| Combo tier-up sting | multiplier increase |
| Combo break sting | miss/crash |
| Coin plink | coin collect (stacked pitch) |
| Crash crunch | collision |
| Police siren | police hazard active |
| Nitro roar | nitro use |
| Weather bed (rain/wind/snow) | weather state |
| Timer warning stinger | ≤ 10 s / ≤ 5 s |
| UI click / hover / confirm / cancel | menu interactions |
| Purchase / upgrade / unlock | economy actions |
| Chest / card reveal | reward open |
| Level-up / mission complete fanfare | progression |
| Countdown 3-2-1-GO | run start |
| Results fanfare / new-best applause | run end |

All audio behind `AudioManager` (subscriber to EventBus), pooled sound instances, master/music/sfx/ui buses.

---

## 7. Source-Code Folder Architecture

```
src/
├── main.ts                  # Phaser.Game bootstrap, config, scene registration
├── core/                    # Engine-agnostic foundations
│   ├── EventBus.ts          #   typed global pub/sub
│   ├── ServiceLocator.ts    #   registers mock/real services
│   ├── StateMachine.ts      #   generic FSM (run states, AI states)
│   ├── ObjectPool.ts        #   generic pool<T>
│   ├── RNG.ts               #   seeded mulberry32 PRNG + hashing
│   └── GameConfig.ts        #   global constants, quality tiers
├── scenes/                  # Phaser scenes = top-level flow states
│   ├── BootScene.ts  PreloadScene.ts  MenuScene.ts  LoadoutScene.ts
│   ├── GameScene.ts  HudScene.ts  PauseScene.ts  ResultsScene.ts
│   └── meta/ GarageScene.ts CardsScene.ts ShopScene.ts BattlePassScene.ts
│            MissionsScene.ts AchievementsScene.ts LeaderboardScene.ts ProfileScene.ts SettingsScene.ts
├── gameplay/                # In-run game objects & rules
│   ├── VehicleController.ts #   player car steering/speed/drift/durability
│   ├── entities/ NpcCar.ts Pedestrian.ts Pickup.ts Coin.ts Hazard.ts Police.ts
│   ├── OrderSystem.ts  ScoreSystem.ts  DifficultySystem.ts  RunController.ts
│   └── CardEffects.ts        #   applies equipped card modifiers to a run
├── systems/                 # Cross-cutting in-run systems
│   ├── CityGenerator.ts  ChunkStreamer.ts  TrafficSystem.ts  HazardSystem.ts  WeatherSystem.ts
├── managers/                # Persistent meta / cross-scene managers
│   ├── EconomyManager.ts  ProgressionManager.ts  MissionManager.ts
│   ├── BattlePassManager.ts  ShopManager.ts  LoadoutManager.ts
├── services/                # Online abstraction (interfaces + mocks)
│   ├── interfaces/ ILeaderboardService.ts ICloudSaveService.ts IProfileService.ts
│   │              ITournamentService.ts ISeasonPassService.ts IAdService.ts
│   ├── mock/ MockLeaderboard.ts MockCloudSave.ts MockProfile.ts MockTournament.ts MockAds.ts
│   └── SaveService.ts        #   local persistence, versioning, atomic write, migrations
├── input/                   # Input abstraction layer
│   ├── InputSystem.ts        #   raw touch/key → actions
│   ├── ActionMap.ts          #   bindings, rebinding, persistence
│   └── HapticService.ts      #   navigator.vibrate wrapper + fallback
├── audio/                   # Sound
│   ├── AudioManager.ts       #   event → cue, ducking, buses
│   └── SoundKeys.ts          #   enum of all hooks
├── ui/                      # Reusable UI widgets (theme-consistent)
│   ├── Button.ts  Panel.ts  Modal.ts  FloatingText.ts  ProgressBar.ts
│   ├── ComboMeter.ts  OrderCard.ts  NavArrow.ts  Speedometer.ts  ControlButtons.ts
│   └── Theme.ts              #   colors, fonts, spacing tokens (from §6.2/6.3)
├── effects/                 # Juice
│   ├── CameraFx.ts (shake/lean/slowmo)  ParticleFx.ts  FloatingRewards.ts
├── data/                    # Data-driven content (JSON) + loaders + schema validation
│   ├── vehicles.json  cards.json  themes.json  missions.json  orders.json  battlepass.json
│   ├── shop.json  achievements.json  balance.json (⚙️ tunables)
│   └── ContentLoader.ts  schemas/*.ts
├── types/                   # Shared TS types/enums (VehicleStat, Rarity, SaveGameV1, ...)
├── assets/                  # atlases, bitmap fonts, audio, per-theme texture packs
└── utils/                   # math, easing, geometry, formatting helpers
```

One-line purposes: **core** = engine-agnostic primitives; **scenes** = flow/FSM; **gameplay** = in-run objects & rules; **systems** = procedural/traffic/weather; **managers** = persistent meta; **services** = online abstraction + save; **input** = action layer; **audio** = sound; **ui** = widgets; **effects** = juice; **data** = content + schemas; **types** = shared contracts; **assets** = art/audio; **utils** = helpers. No monolithic classes; each file one responsibility.

---

## 8. Build Order / Vertical-Slice Definition

### 8.1 MVP "Vertical Slice" (must be real, playable, juicy)

The slice proves the core loop is fun in isolation before any meta is built.

**MVP contains (fully implemented):**
1. Boot → Loadout(minimal) → Game → Results loop with scene FSM.
2. `InputSystem` + 3 on-screen buttons + keyboard dev input; `VehicleController` with arcade steering, drift, turn window, snappy feel (< 50 ms response).
3. `CityGenerator` + `ChunkStreamer`: one theme (**Modern City**), seeded, streamed grid with buildings and roads, object-pooled.
4. `OrderSystem`: pickup→dropoff cycle, nav arrow, order card with sub-timer.
5. `ScoreSystem`: combo/multiplier/coins with the §5.7 formulas; combo break on miss/crash.
6. `TrafficSystem`: pooled NPC cars with basic lane FSM + collision.
7. `DifficultySystem`: within-run intensity ramp (traffic density + order timer).
8. HUD: timer, coins, combo meter, order card, nav arrow, speedometer, 3 buttons.
9. Core juice: drift particles, screech, delivery burst + floating text, screen shake, near-miss slow-mo, combo break sting; Reduced Motion toggle.
10. `AudioManager` wired to the essential hooks (engine, screech, pickup, delivery, combo, coin, crash, UI, countdown, results).
11. `SaveService` v1 (localStorage, versioned, atomic) persisting high score + best combo + settings + coins.
12. Results screen: score, coins earned, best-combo, new-best celebration, Retry/Home.
13. Performance: 60 FPS on a mid-range device with pools + one theme atlas; quality-tier FPS probe.

**Definition of done for the slice:** a fresh player understands and enjoys a 60-second run, chains combos, feels the juice, and immediately taps "Retry" — with zero meta systems present.

### 8.2 Stubbed / mocked in MVP (interfaces real, content thin)

- Garage, Cards, Shop, Battle Pass, Missions, Achievements, Events, Profile, Leaderboards screens: **navigable stubs** reading from data files with placeholder content; buttons wired to managers that no-op or return mock data.
- `EconomyManager`/`ProgressionManager`: real coin banking + XP/level, but upgrade/purchase flows may be minimal.
- Card effects: interface + 2–3 implemented (Coin Bonus, Traffic Reduction, Slow Motion) to prove `CardEffects` pipeline; rest defined as data, effects stubbed.
- Themes: 1 real (Modern City), other 7 defined in `themes.json` with palettes but not art-complete.
- All online services: `Mock*` implementations behind interfaces (leaderboards show seeded fake players; cloud save mirrors local; ads return "reward granted").
- Haptics: real wrapper, safe no-op where unsupported.

### 8.3 Post-slice build order (priority)

1. **Meta economy real:** Garage upgrades (cost curve), full card system + shards + upgrades, currencies, loadout persistence.
2. **Content breadth:** remaining themes (art + params), all card effects, hazards (road work, accidents, police, weather), nitro system.
3. **Retention systems:** daily missions, achievements, battle pass, daily shop, weekly event.
4. **Online (mock→real ready):** leaderboards/country/friends, tournaments, season pass, profiles, cloud save — swap mocks for HTTP services via ServiceLocator.
5. **Monetization:** rewarded ads (real SDK behind `IAdService`), cosmetic skins, gem store — audited against "no pay-to-win."
6. **Polish & LiveOps:** additional juice passes, accessibility audit, performance hardening on low-end, content pipeline/hot-reload for LiveOps updates.

---

## Appendix — Key Tunables (`data/balance.json` ⚙️)

| Key | Default | Meaning |
|---|---|---|
| `combo.tierThresholds` | [2,4,7,12] | combo counts for x1.5/x2/x3/x5 |
| `combo.multipliers` | [1,1.5,2,3,5] | multiplier per tier |
| `order.baseValue` | 100 | base coins per delivery |
| `order.timeLimitStart` / `End` | 14 / 9 | sub-timer seconds at run start/end |
| `upgrade.baseCost` / `growth` | 120 / 1.55 | stat upgrade cost curve |
| `xp.deliveryXp` / `comboXp` | 10 / 5 | run XP components |
| `traffic.maxNpcs` | 24 | active NPC cap |
| `traffic.spawnIntervalStart` / `End` | 1.2 / 0.4 | seconds between spawns |
| `run.duration` (per theme) | 45–90 | master timer |
| `nearMiss.radius` / `slowmoMs` | tuned / 120 | near-miss juice |
| `feel.turnWindowMs` / `inputBufferFrames` | 180 / 6 | steering forgiveness |

*This document is the single source of truth. Any deviation must trace back to a pillar or core value, or update this file.*
