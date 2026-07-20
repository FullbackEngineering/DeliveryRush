# 02 — System Specification Method (Delivery Rush)

## Overview

Delivery Rush specifies its key systems using behavior-focused contracts. Below are three core systems fully specified: **Vehicle**, **RunState** (economy), and **OrderSystem**. Each follows the standard eight-field format: Name, Purpose, Inputs, Outputs, Owned State, Rules & Invariants, Dependencies, and Acceptance Criteria.

---

## Vehicle System — Specification

### System Identity
- **Name:** Vehicle
- **Purpose:** Simulate player and traffic car steering, throttle, movement, and collision response.
- **Owner:** Gameplay Lead

### Interface

**Inputs:**
- `steer` (enum: Left / Straight / Right, queued from input buffer or AI)
- `throttleHeld` (boolean, per frame from ControlPad or AI)
- `crash` (boolean, from collision detection; triggers durability/recovery)
- `dt` (float seconds, per-frame time delta, typically 0.016s at 60fps)

**Outputs:**
- `positionChanged` (vector: world position, per frame)
- `headingChanged` (enum: N/E/S/W, per frame)
- `speedChanged` (float: px/s, per frame, emits to Event Bus)
- `crashed` (event: crash occurred, emits severity/direction)
- `nearMiss` (event: traffic near but not colliding; triggers slow-mo visual)

### Owned State
- `position`: (x, y) in world pixels; initialized at spawn; range [0, gridCols×blockPx] × [0, gridRows×blockPx]
- `heading`: Direction enum (N/E/S/W); initialized at spawn
- `speed`: float, px/s; valid range [0, maxSpeed]; initialized at 0 (stopped)
- `throttleTarget`: float, 0..1 normalized; set by input; driving the speed approach
- `steerBuffer`: Steer enum or null; buffered next turn; survives until next intersection
- `durability`: int, hit count before crash penalty; valid range [0, maxDurability]
- `crashRecovery`: float, 0..1 recovery multiplier applied to speed post-crash
- `isMoving`: boolean; true if speed > idleSpeedThreshold

### State Diagram

| Current State | Trigger | Next State | Action |
|---------------|---------|-----------|--------|
| **Idle** | throttleHeld = true | Accelerating | Set throttleTarget = 1.0 |
| **Accelerating** | throttleHeld = false | Decelerating | Set throttleTarget = idleSpeedFactor |
| **Decelerating** | speed < idleSpeed | Idle | Set speed = idleSpeed |
| **Any state** | Collision detected | Crashed | Apply crash slowdown; decrement durability |
| **Crashed** | crashRecovery >= 1.0 | (same state) | Restore speed to pre-crash multiplier |

### Rules & Invariants
- Speed magnitude never exceeds `maxSpeed` (vehicle-dependent, 240–380 px/s).
- Speed never goes negative.
- Throttle target is 1.0 (cruise) or `idleSpeedFactor` (0.32×maxSpeed).
- Turn commits only when within `turnCommitDist` (26 px) of an intersection center.
- Steer buffer persists up to `inputBufferTime` (2.0 s) or until consumed at next intersection.
- Durability never goes below 0; max depends on vehicle (3–5 hits).
- After a crash, `crashRecovery` lerps from 0.35 to 1.0 at `crashRecover` (1.6 per second).
- Off-road (outside grid bounds or in building) triggers instant crash.

### Edge Cases & Failure Modes
- **Two simultaneous inputs (e.g., Left and Right tapped at once):** Keep most recent; discard older.
- **Steer buffer persists longer than one block:** Normal; will consume on the next intersection after activation.
- **Intersection edge case (turn window very small):** If `turnCommitDist` is small and car travels fast, a steer might miss the window. Mitigate: buffer size is generous (2.0s input window, exceeds one-block travel time for starter car).
- **Crash while buffering a turn:** Turn commits post-crash at the next intersection, as normal.
- **Speed ramps can stutter if dt is very large (lag spike):** Clamp dt to max 0.05s to prevent simulation blowup.

### Dependencies
- **CityGrid:** For intersection center queries, road bounds validation, off-road detection.
- **TrafficSystem:** Receives collision/near-miss signals from traffic cars.
- **RunState:** Reads only; no functional dependency (RunState reacts to Vehicle crashes via Event Bus).
- **Entity State:** Reads own vehicle record; stores position/heading back.

### Acceptance Criteria

- [ ] Vehicle accelerates smoothly from 0 to maxSpeed when throttleHeld = true; curve is exponential (lambda-damped) per `accelDamp` balance value.
- [ ] Vehicle decelerates from maxSpeed to `idleSpeed` when throttleHeld = false; deceleration is 1.65× faster than acceleration (per `brakeDamp`).
- [ ] Speed never exceeds maxSpeed regardless of input history or frame time.
- [ ] Steer buffer accepts input and persists for 2.0 seconds; a turn commits at the next intersection if buffer is non-null.
- [ ] Crash detection triggers `crashed` event; vehicle speed multiplied by 0.35; recovery to 1.0 over ~0.6s (1.6/s).
- [ ] Input sampled at 60 Hz; steer/throttle received from input buffer; no input is lost within a 16ms frame.
- [ ] After crash, a buffered steer still commits at the next intersection (turn is not cancelled).
- [ ] Position and heading are synchronized with CityGrid queries (intersection lookups are consistent).

---

## RunState System — Specification

### System Identity
- **Name:** RunState
- **Purpose:** Pure run-scoped economy: track combo multiplier, coin earnings, score, and time; apply balance formulas.
- **Owner:** Gameplay Design Lead

### Interface

**Inputs:**
- `onDelivered` (Order object with baseReward, vip flag)
- `onCrash` (boolean signal)
- `onOrderExpired` (boolean signal)
- `dt` (float seconds, per-frame time delta)
- `cardModifiers` (coinBonus multiplier, freeCrashes count; set once before run)

**Outputs:**
- `ComboChanged` (event: new streak, multiplier; emits on delivery or combo break)
- `ComboBroken` (event: streaksignal fired when streak resets to 0)
- `RunCoins` (event: total coins earned this run)
- `RunScore` (event: total score this run)
- `RunTimer` (event: seconds remaining, fraction 0..1)

### Owned State
- `time`: float, seconds remaining; valid range [0, maxTime (60s)]; initialized to `Run.startTime` (45s)
- `streak`: int, consecutive deliveries without miss; valid range [0, ∞); initialized to 0
- `maxStreak`: int, best streak reached this run; valid range [0, ∞); initialized to 0
- `deliveries`: int, total deliveries completed; valid range [0, ∞); initialized to 0
- `coinsThisRun`: int, total coins earned (pre-tax); valid range [0, ∞); initialized to 0
- `score`: int, leaderboard score; valid range [0, ∞); initialized to 0
- `ended`: boolean; initialized to false
- `coinBonus`: float multiplier from equipped cards; default 1.0
- `freeCrashes`: int, remaining free crash charges; set by card modifiers
- `difficulty`: float 0..1, computed from deliveries / rampDeliveries

### State Diagram

| Current State | Trigger | Next State | Action |
|---------------|---------|-----------|--------|
| **Running** | onDelivered(order) | Running | Increment streak; apply coins & score formulas; emit ComboChanged |
| **Running** | onCrash() with freeCrashes > 0 | Running | Decrement freeCrashes; do NOT reset streak (free pass) |
| **Running** | onCrash() with freeCrashes = 0 and streak > 0 | Running | Reset streak to 0; emit ComboBroken; time -= 2s |
| **Running** | onOrderExpired() with streak > 0 | Running | Reset streak to 0; emit ComboBroken; no time penalty |
| **Running** | time <= 0 | Ended | Set ended=true; freeze run |

### Rules & Invariants
- `time` never goes below 0; clamped at 0 when run ends.
- `time` never exceeds `maxTime` (60s); time banked beyond cap is lost.
- `streak` is always ≥ 0.
- `multiplier = min(comboCap (8), streak)`; only complete deliveries count (streak must be ≥ 1 for multiplier > 1).
- Coins earned = `(baseReward + distanceBonus) × multiplier × vipMultiplier × coinBonus`, rounded down.
- Score = `coins × scoreFactor + scorePerDelivery`; for Delivery Rush, scoreFactor=1, scorePerDelivery=120.
- `difficulty` computed as `min(1, deliveries / rampDeliveries (12))`; ramps linearly.
- Free crashes are a finite resource; once depleted, next crash breaks combo.
- Coins already banked are never taken away (loss aversion ethical design).

### Edge Cases & Failure Modes
- **Simultaneous crash and delivery (collision at pickup/dropoff):** Process delivery first (collision is after arrival), then crash. Streak increments, then immediately crashes if collision is confirmed.
- **Time truncation at run end:** Partial coins from the last fraction of a second are not awarded. Only complete deliveries count.
- **Order expires and player crashes in same frame:** Both OnOrderExpired() and OnCrash() fire; order expiry resets streak, then crash is a no-op (streak already 0).
- **Difficulty ramp at cap:** Once deliveries >= 12, difficulty stays at 1.0; order time limit stays at 12s, VIP chance at 30%.

### Dependencies
- **Balance.ts:** Reads `Run`, `Scoring`, `Difficulty` config (startTime, comboCap, vipMultiplier, etc.).
- **Event Bus:** Emits facts; no dependency on listeners.

### Acceptance Criteria

- [ ] Streak increments by 1 on each OnDelivered(order) call; maxStreak tracks the highest reached.
- [ ] Multiplier = min(8, streak); multiplier = 1 when streak = 0 or 1.
- [ ] Coins calculated as: (100 + distanceBonus) × multiplier × vipMult × coinBonus, rounded down.
- [ ] Time starts at 45s; +7s per delivery (capped at 60s total); never exceeds 60s.
- [ ] Difficulty ramps linearly from 0 to 1 over 12 deliveries; stays at 1 thereafter.
- [ ] orderTimeLimit() returns 22s at difficulty 0, 12s at difficulty 1; linear interpolation in between.
- [ ] vipChance() returns 8% at difficulty 0, 30% at difficulty 1; linear interpolation.
- [ ] On crash with freeCrashes > 0, streak is preserved; freeCrashes decremented by 1.
- [ ] On crash with freeCrashes = 0 and streak > 0, streak resets to 0; time -= 2s; ComboBroken emitted.
- [ ] On order expired with streak > 0, streak resets to 0; ComboBroken emitted; no time penalty.
- [ ] Score = coins × 1 + deliveries × 120 (per Delivery Rush design).

---

## OrderSystem System — Specification

### System Identity
- **Name:** OrderSystem
- **Purpose:** Manage delivery order lifecycle: spawn, track pickup/dropoff, timeout, completion.
- **Owner:** Gameplay Lead

### Interface

**Inputs:**
- `onRunStart` (signal: initialize order spawning)
- `playerPosition` (vector: world position, per frame)
- `playerPickedUp` (boolean: player in pickup radius?)
- `playerDroppedOff` (boolean: player in dropoff radius?)
- `dt` (float seconds, per-frame time delta)
- `difficulty` (float 0..1 from RunState)

**Outputs:**
- `OrderSpawned` (event: new order card, pickup/dropoff beacons)
- `OrderPickedUp` (event: cargo acquired)
- `OrderDelivered` (event: coins, multiplier applied)
- `OrderExpired` (event: order timed out, combo broken)

### Owned State
- `activeOrder`: Order object or null; initialized at null
- `orderTimer`: float, seconds remaining for active order; valid range [0, timeLimit]
- `pickupBeacon`: (col, row) grid position; spawn-time random
- `dropoffBeacon`: (col, row) grid position; spawn-time random, distant from pickup
- `orderIdCounter`: int, auto-increment for order IDs

### State Diagram

| State | Trigger | Next | Action |
|-------|---------|------|--------|
| **Idle** | RunStart | WaitingPickup | Generate order; place beacons; emit OrderSpawned |
| **WaitingPickup** | playerAtPickup | Carrying | Mark order.pickedUp=true; emit OrderPickedUp |
| **WaitingPickup** | orderTimer <= 0 | Idle | Emit OrderExpired; spawn new order |
| **Carrying** | playerAtDropoff | Idle | Emit OrderDelivered; spawn new order |
| **Carrying** | orderTimer <= 0 | Idle | Emit OrderExpired; spawn new order |

### Rules & Invariants
- Only one active order at a time.
- Pickup and dropoff beacons are on the city grid (valid road intersections), minimum distance apart.
- Order timer counts down from `RunState.orderTimeLimit()` (which depends on difficulty); never goes below 0.
- Order expires if timer reaches 0 before delivery.
- Pickup radius is ~100px (half a city block); dropoff radius is ~80px (tighter).
- Order IDs auto-increment and never repeat within a session.
- New orders spawn immediately after previous delivery or expiry (no delay).

### Edge Cases & Failure Modes
- **Player at pickup and dropoff simultaneously (impossible geometry, but edge case):** Process pickup first. Player must exit and re-enter dropoff radius to deliver.
- **Player picks up, crashes, loses combo, then delivers:** RunState handles combo break; OrderSystem still awards coins for delivery.
- **Order expires during pickup animation:** Order is considered picked up; expiry check happens after pickup (pickup takes priority).
- **RNG places beacons in unreachable location (surrounded by traffic):** Rare; mitigated by grid size (16×16) and traffic density tuning. If it occurs, order is still valid; player must navigate.

### Dependencies
- **CityGrid:** For beacon placement (valid road cells).
- **RunState:** Reads orderTimeLimit() and vipChance().
- **Vehicle:** Reads player position every frame (via Entity State).
- **Event Bus:** Emits order events; no dependency on listeners.

### Acceptance Criteria

- [ ] Order spawns immediately after RunStart or after previous order delivery/expiry; no gaps.
- [ ] Pickup and dropoff beacons are placed on distinct valid road cells, minimum 2 blocks apart (Manhattan distance).
- [ ] Order timer starts at RunState.orderTimeLimit(), counts down per frame, emits OrderExpired if <= 0.
- [ ] Player within pickup radius triggers OrderPickedUp; order.pickedUp flag set; nav arrow switches to dropoff.
- [ ] Player within dropoff radius after pickup (and before timer expiry) triggers OrderDelivered; new order spawns.
- [ ] Order expires if timer reaches 0 before delivery; OrderExpired emitted; new order spawns.
- [ ] VIP flag (5% of orders at low difficulty, 30% at max) is set at spawn and persists until delivery/expiry.
- [ ] baseReward varies by order kind (Pizza=100, Coffee=80, etc.) per `orderKinds.ts` data.
- [ ] Order ID is unique and auto-incremented; never reused in a session.

---

## Validation Checklist

- [x] Every system spec has a single, unique name that doesn't overlap with others.
- [x] Purpose is one sentence and answers "why does this exist?"
- [x] All inputs are named, typed, and have valid ranges or value sets.
- [x] All outputs are named, typed, and specify when they fire (per-frame, on-event, etc.).
- [x] Owned state is explicitly listed; no assumptions about implicit state.
- [x] Every rule written as an invariant or edge case can be tested or asserted in code.
- [x] State transitions form a complete graph; no orphaned states or unreachable conditions.
- [x] Dependencies are listed; no hidden coupling to unlisted systems.
- [x] Acceptance criteria are testable without subjective judgment (no "feels right").
- [x] A new engineer could implement these systems without asking questions.

## Status

**Complete for three core systems (Vehicle, RunState, OrderSystem).** Additional systems (TrafficSystem, ControlPad input, Audio, Effects) follow the same specification method; specs for those can be added as needed. All specs are implementable in both Phaser 2D and Three.js (engine-agnostic behavior).
