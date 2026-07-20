# 04 — Game Loop & State Management (Delivery Rush)

## Timestep & Core Loop

### Timestep Choice
- **[x] Fixed** (interval: 16.67 ms @ 60 FPS)

**Justification:**
Delivery Rush requires deterministic vehicle steering, collision detection, and combo tracking. A fixed 60 FPS timestep ensures:
1. Consistent turn commits at intersections regardless of framerate (frame drops don't miss turns).
2. Deterministic combo multiplier calculation and crash detection.
3. Physics stability (vehicle speed, throttle approach, collision response).
4. Replay-friendly (input-only state, no time-dependent randomness).

The Phaser 3 engine uses a fixed update loop internally; Three.js rewrite will maintain fixed timestep via an accumulator pattern.

---

## Per-Frame Responsibilities

### 1. INPUT PHASE (0–2ms)
Collect and queue user intent without acting on it.

- Poll touch screen (three control buttons: Left, Straight, Right, and a Gas pedal).
- Poll keyboard (↑/W/Space for gas; ←/→/A/D for steering; Esc/P for pause).
- Poll gamepad (if supported; left stick for steering, right trigger for gas).
- Translate device input to canonical actions (steer=Left/Straight/Right, throttle=0/1).
- Queue actions into input buffer (not applied yet).

**Frame budget:** ≤ 2 ms.

### 2. UPDATE PHASE (6–12ms)
Execute queued input and advance simulation by one fixed timestep (Δt = 0.01667 s).

**Substeps (in order):**

**a) Process Input:**
- Consume throttle input → set Vehicle.throttleTarget.
- Consume steer input → buffer in Vehicle.steerBuffer (if within intersection commit window, apply immediately).

**b) RunState Tick:**
- Decrement time by Δt.
- Compute difficulty = min(1, deliveries / rampDeliveries).
- Check if time ≤ 0 → set ended=true, emit RunEnd.
- Emit RunTimer event (timeRemaining, fraction 0..1) for HUD.

**c) Vehicle Tick (Player + AI):**
- Apply throttle target → speed approaches target via exponential damping (lambda-based).
- Apply steer buffer → if within turnCommitDist of intersection, commit turn (change heading); clear buffer.
- Update position based on speed and heading.
- Check off-grid/building collision → trigger crash if applicable.
- Emit SpeedChanged event if speed changed significantly.

**d) TrafficSystem Tick:**
- Spawn/despawn AI cars based on difficulty and player speed.
- Update each AI car's position and heading.
- Collision detection: player ↔ traffic, traffic ↔ traffic.
- Emit Crash event if player hit; emit NearMiss if close but no collision.

**e) OrderSystem Tick:**
- Decrement active order timer by Δt.
- Check if player proximity (pickup radius or dropoff radius).
  - If in pickup radius and not yet picked up → set order.pickedUp=true, emit OrderPickedUp.
  - If in dropoff radius and already picked up → emit OrderDelivered, call RunState.onDelivered().
- If order timer ≤ 0 and not picked up → emit OrderExpired, call RunState.onOrderExpired().
- If order timer ≤ 0 and picked up → emit OrderExpired (order overdue mid-delivery), spawn new order.

**f) Respond to Events (Bus):**
- RunState.onDelivered() → update streak, coins, score; emit ComboChanged, RunCoins, RunScore.
- RunState.onCrash() → reset streak if no free crash; emit ComboBroken or hold streak.
- Audio/Effects listen to events and queue sounds/particles (no state mutation).

**Frame budget:** 6–12 ms total (60 FPS = 16.67 ms per frame; 6–12 ms is conservative headroom).

### 3. RENDER PHASE (2–4ms)
Read current state (do not modify) and draw to screen.

- Read Vehicle position, heading, speed; draw sprite, rotation, animation frame.
- Read active Order pickup/dropoff beacons; draw visual indicators (pulsing circles).
- Read RunState time, streak, coins; render HUD text and meter animations.
- Read active particles; render burst, confetti, floatText.
- Cull off-screen entities.
- Submit draw calls to GPU.
- Present frame.

**Frame budget:** 2–4 ms (GPU operations are async; CPU work is minimal).

**Frame budget total:** 2 + 12 + 4 = 18 ms worst-case; actual ~11ms on mid-range phones.

---

## Game State Machine

### Top-Level States

```
BOOT → PRELOAD → MAIN MENU ⇄ {GARAGE, SHOP, SETTINGS, PROFILE}
                      │
                   [Play] → PRE_RUN (select vehicle + cards + theme)
                      │
                    GAME (core loop + HUD overlay) ⇄ PAUSE
                      │
                   RESULTS (score tally, retry/menu)
```

### State Specifications

| State | Description | Entry Responsibility | Exit Responsibility | Valid Transitions |
|-------|---|---|---|---|
| **Boot** | Engine init, asset load. Phaser engine starting up. | Initialize Phaser game object; start Preload scene | N/A (one-time) | Preload |
| **Preload** | Load assets (textures, audio, JSON data). | Subscribe to preload events; show loading bar. | Unload non-essential assets. | Main Menu |
| **Main Menu** | Title screen, New Game / Continue / Quit buttons. | Restore UI; load player profile; enable touch. | Save menu state if needed. | Garage, Shop, Settings, Pre-Run (Play), Quit |
| **Garage** | Vehicle/card management, upgrades, cosmetics. | Load player inventory (vehicles, cards); render upgrade panels. | Save loadout (selectedVehicle, equippedCards). | Main Menu |
| **Shop** | Purchase vehicles, cards, cosmetics with coins/gems. | Load shop inventory; render products. | Save profile changes. | Main Menu, Garage |
| **Settings** | Audio, graphics, language, input rebinding. | Load settings from localStorage. | Save settings to localStorage. | Main Menu |
| **Pre-Run** | Select vehicle, 3 equipped cards, city theme. | Load available vehicles/cards; render selection UI. | Capture vehicle ID, card IDs, theme in RunContext. | Game |
| **Game** | Core gameplay loop (Input → Update → Render cycle). | Create RunState (time=45s, streak=0); spawn vehicle; spawn first order; emit RunStart. | Save RunContext if needed for replay. | Pause, Results |
| **Pause** | Game frozen; player reviews options, stats, or returns to menu. | Freeze RunState.tick(); disable input; show pause menu. | Resume RunState updates. | Game, Results (if user quits to menu) |
| **Results** | Score tally, high-score check, retry/menu buttons. | Freeze all gameplay; compute final score; update PlayerProfile; show results screen. | Log result to analytics. | Main Menu (tap Home), Pre-Run (tap Retry) |

---

## Context Preservation & Session Management

### On Exit From `Game` (Pause or End)

Save to RunContext (memory; not disk):
- Current RunState (time, streak, coins, score) — needed for resume from pause or replay.
- Current Vehicle state (position, heading, speed) — needed for pause resume.
- Current Order (pickup location, timer) — needed for resume.
- Seed (CityGrid seed) — needed to regenerate city on resume or replay.

### On Entry To `Game`

Restore from RunContext or initialize fresh:
- If resuming from Pause: restore RunState, Vehicle, Order, CityGrid.
- If starting a new run: initialize fresh RunState (time=45s, streak=0, coins=0); spawn Vehicle; generate CityGrid with daily seed; spawn first Order.

### On Exit From `Results`

- Update PlayerProfile with final score, coins, delivery count.
- Save to SaveManager (persists to localStorage).
- Clear RunContext (free memory).

### On Exit From `Main Menu`

- Save any menu state (last-selected tab).
- Unload non-essential UI textures if memory is tight.

---

## State Machine Diagram (ASCII)

```
                    ┌──────────────┐
                    │ Boot/Preload │
                    └──────┬───────┘
                           │
                    ┌──────▼──────────┐
         ┌──────────┤  Main Menu      ├─────────┐
         │          │  (New/Continue) │         │
         │          └──────┬──────────┘         │
         │                 │                    │
    ┌────▼──┐         ┌────▼────┐    ┌─────┐  │
    │Garage │◄────────│ Pre-Run │    │Shop │  │
    │(equip)│         │(select) │    │     │  │
    └────┬──┘         └────┬────┘    └─────┘  │
         │                 │                    │
         └────────────┬────┴────────────────────┘
                      │
                   ┌──▼──────┐
                   │ Game    │
                   │(30-90s) │
                   └────┬────┘
                        │
                        ├─→ [Pause] ──→ [Resume] ──→ [Game]
                        │
                        └─→ [End (time=0)] ──→ Results ──┬──→ [Retry] ──→ Pre-Run
                                                          │
                                                          └──→ [Home] ──→ Main Menu
```

---

## Determinism Requirement

- **[x] Yes** — Delivery Rush requires determinism for:
  1. **Replay mechanic (future):** Record input, re-run with same seed.
  2. **Leaderboards (future):** Fair scoring across all players.
  3. **Testing & QA:** Reproduce bugs reliably.
  4. **Networked multiplayer (future):** Deterministic simulation + input reconciliation.

**How Determinism is Ensured:**

1. **Fixed timestep:** 60 FPS, Δt = 0.01667 s always. No variable framerate effects on physics.

2. **Deterministic RNG:** City layout seeded with daily seed (same seed = same city). Order RNG seeded with (runId, orderNumber).

3. **Input-only state:** Simulation depends only on:
   - Initial conditions (vehicle stats, seed, time)
   - Input history (steering, throttle)
   - Balance values (read from Balance.ts, not dynamic)
   
   **No:** system time, random chance mid-simulation, floating-point precision errors.

4. **Crash detection:** Collision grid deterministic; no floating-point tolerance issues (grid-aligned intersections).

5. **No floating-point rng:** For probabilities (VIP chance, crash threshold), use seeded RNG with explicit seed input, never `Math.random()`.

**Reproducibility Testing:**
- Record (playerInput[], seed, vehicleType, cardIds) → replay with same inputs, verify identical trajectory.
- Currently tested in Phaser MVP; Three.js rewrite will maintain invariants.

---

## Pausing & Resuming

**Pause Flow:**
1. User taps Pause button (or presses Esc/P).
2. Game scene freezes: RunState.tick() stops; Vehicle.tick() stops; order timer pauses.
3. Pause menu overlays; HUD is grayed.
4. User resumes or returns to menu.

**Resume Flow:**
1. RunState.tick() resumes (time continues); Vehicle.tick() resumes.
2. Pause menu hides; HUD is active.
3. Input is re-enabled; loop continues.

**No state mutation during pause** — all values are preserved in memory.

---

## Validation Checklist

- [x] Timestep choice (fixed 60 FPS) is documented and justified for Delivery Rush's needs.
- [x] The input → update → render pattern is enforced: input queues; update executes; render reads only.
- [x] State machine has 8 top-level states (Boot, Preload, Main Menu, Garage, Shop, Settings, Game, Results), all with clear entry/exit.
- [x] No undefined transitions: every state knows which states it can move to.
- [x] Context preservation plan exists: RunContext saved on Game exit, restored on Game entry.
- [x] Determinism requirement (yes) is declared; fixed timestep and input-only state are enforced.
- [x] Pause / resume cycle is well-defined: freezes RunState, preserves all values.
- [x] A developer new to the codebase can draw the state machine and describe the per-frame loop.

## Status

**Complete.** Phaser MVP implements this loop and state machine. Three.js rewrite will preserve timestep (60 FPS) and state machine topology (only rendering/animation layers change).
