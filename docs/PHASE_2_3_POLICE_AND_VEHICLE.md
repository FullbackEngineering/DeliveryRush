# Police, Speeding & Vehicle Feel — Phase 2 & 3 Implementation Plan

**Status:** design/hand-off doc. Last updated 2026-07-19.

**Scope:** Phases 2 & 3 from `docs/OPEN_WORLD_ORDERS_PLAN.md` (Phase 1, open-world
orders + POI system, is being implemented separately). This doc details the police
and speeding layer for SERBEST (fair, small fines, short chases) and the vehicle
animation/feel pass (steering front wheels, body lean, accel/brake pitch).

**Dependency:** Phase 2 assumes Phase 1's SERBEST persistent-wallet (`Profile.coins`)
and `FreeHud.ts` are in place; the police HUD feeds into the same overlay. Phase 3
(vehicle feel) is independent and applies to both RUSH and SERBEST.

This doc is prescriptive: it names exact files, data shapes, `Balance` keys, bus
events and acceptance checks so a coding agent can implement it phase-by-phase
without re-deriving the architecture. Read `CLAUDE.md` and `DEVELOPMENT_STATUS.md`
first; obey the repo conventions (tune in `core/Balance.ts`, communicate via the
`bus`, always `bus.off(...)` on teardown, `Profile` is the only save mutation point).

---

## PHASE 2 — Police, Speeding & Fines

The player now respects (or is punished for ignoring) speed limits on the city
grid. A small pool of patrol cops enforces the rules via fines; chasing the player
after detection; and speed cameras at fixed intersections. The economy is fair:
fines scale, chases are escapable, and the law stays out of RUSH mode entirely.

### 2.1 Speed limits & detection

SERBEST roads come in two widths (via `FREE_CITY`'s avenue grid):
- **Normal streets** (`roadWidth = 16 m`): `speedLimit = 60 km/h`.
- **Wide avenues** (`avenueWidth = 36 m`): `avenueSpeedLimit = 100 km/h`.

Detect the player's current road type by checking the nearest grid line via
`grid.isAvenue(idx)` (exposed on `Grid` — add if missing). The player is
`speeding = vehicle.speedKmh > limit`. This fact is queried passively by the
police system; it's not an event yet — only the **detection** (cop in range + player
speeding) emits `PoliceFine`.

### 2.2 Patrol police (`src/world/Police.ts`)

A small pool of **cop cars** patrol roads near the player, recycling around them
(same pattern as `Traffic3D`). Each cop has a state machine: `patrol` (cruising a
road), `alerted` (chasing), `returning` (heading back to a safe road after a chase
ends).

**Data per cop:**
```ts
interface PoliceCar {
  active: boolean;
  state: 'patrol' | 'alerted' | 'returning';
  axis: 'x' | 'z';       // road orientation
  line: number;          // fixed coord of that road (m)
  laneHalf: number;      // right-hand lane offset
  pos: number;           // moving coord along road (m)
  dir: number;           // +1 / -1
  speed: number;         // m/s
  x: number; z: number;  // world position
  yaw: number;           // facing angle
  alertedTime: number;   // seconds in alerted state (for heat meter)
  lastFineTime: number;  // debounce fines (no repeat within fineCooldownSec)
}
```

**Patrol phase:**
- Cops cruise a road at steady speed (within `World.trafficMinSpeed..trafficMaxSpeed`).
- Their position is computed like `Traffic3D` (fixed X/Z offset per road).
- At each update, **check if the player is speeding within `noticeRadius`** of the
  cop's world position. If so:
  - Transition to `alerted` (reset alertedTime, emit `ChaseStarted`).
  - **Emit `PoliceFine`** with the computed amount (no repeat within `fineCooldownSec`).
  - Start chasing (see below).

**Chase phase** (alerted):
- The cop accelerates toward the player's world position at `chaseSpeedMul × playerCruiseSpeed`.
- Steer toward the player (simple steering: lerp yaw toward player heading, bounded
  by max turn rate so it's not instant).
- Stay on roads: after computing the new position, clamp via `grid.resolveRoads()`
  so the cop slides along building walls rather than driving through them (reuse
  `Vehicle3D`'s road-follow logic).
- **Heat meter** (visual feedback on HUD): emit `Wanted(level)` each frame, where
  `level = (alertedTime / escapeSec)` capped at 1 (so it rises over time until
  escape).
- **Escape condition**: if the player is > `escapeDist` away for `escapeSec`
  continuous seconds → cop gives up.
  - Transition to `returning` (heading back to a safe patrol road).
  - Emit `ChaseEnded`, clear heat meter.
- **Bust condition** (failure to escape): if cop is within `bustDist` for `bustSec`
  → bigger fine, brief vehicle crash (`vehicle.crash()` — player loses momentum
  momentarily), chase resets.
  - Emit a second `PoliceFine` with `bustFine` amount (if not debounced by the same
    cop).
  - Transition back to `patrol` after a short cooldown.

**Returning phase:**
- Cop drives back toward a safe patrol road at reduced speed.
- Once on a road, transition to `patrol`.
- Keep it short so the cop doesn't hang around forever; a timer (5–10 sec) can auto-reset
  to patrol.

**Pool recycling** (like Traffic3D):
- When a cop's distance from the player exceeds `World.trafficRadius` OR it leaves
  the world bounds → **respawn** near the player (within `World.trafficRadius`) on a
  new road.
- Keep `poolSize = 6` (cache limit) with `patrolCount = 4` active (so only 4 of the
  6 pool slots are ever on duty). This keeps rendering cheap (4 cop cars ≤ 2 draw
  calls if instanced).

### 2.3 Speed cameras (optional, cheap v1)

Fixed speed-enforcement cameras at seeded intersections across the city. Each frame:
- Trigger box at the camera's position (a small radius, e.g., 8 m).
- If the player passes through over the limit → flash + fine + debounce (one per
  camera per trip over the limit).

**Placement:** seed via `dailySeed()` and the RNG (deterministic per day so the
player's mental map is stable). Place `cameraCount = 8` cameras across the grid;
find intersections and snap to their centers.

**Emission:** on trigger, emit `SpeedCameraFlash` (HUD flashes red) and `PoliceFine`
(if not debounced by the same camera).

Keep this **fold into `Police.ts`** as a simple secondary loop; or extract to
`SpeedCamera.ts` if it grows. For now, one file is simpler.

### 2.4 Fine formula

```
fine = fineBase + finePerKmhOver * (speedKmh - limit)
```
- `fineBase = 30` (minimum; speeds a bit over the limit).
- `finePerKmhOver = 2` (penalty escalates with how fast you're going).
- Example: 70 km/h in a 60 zone → `30 + 2*(70-60) = 50` coins.
- Example: 90 km/h in a 100 zone → `0` (not fined; within limit).
- Bust fine: `bustFine = 120` (the caught-by-cop penalty; much higher).

**Application:** `Profile.addCoins(-fine)` (negative reduces coins, clamps ≥ 0).

### 2.5 Debouncing & fairness

To avoid spam-fining the same player for the same infraction:
- **Per-cop cooldown**: each cop doesn't fine the same player twice within
  `fineCooldownSec = 6` (so a chased player has breathing room to escape).
- **Per-camera cooldown**: each speed camera doesn't fine for the same incident
  twice (reset when the player exits and re-enters the trigger radius).
- Both debounces are tracked on the cop/camera object (e.g., `lastFineTime`).

### 2.6 New `Balance.Police` block

Add to `src/core/Balance.ts`:

```ts
export const Police = {
  speedLimit: 60,          // km/h, normal streets
  avenueSpeedLimit: 100,   // km/h, wide avenues
  noticeRadius: 45,        // m — cop notices a speeder within this
  fineBase: 30,
  finePerKmhOver: 2,
  fineCooldownSec: 6,      // debounce repeat fines from the same cop
  chaseSpeedMul: 1.15,     // cop top speed = player cruiseSpeed * this
  escapeDist: 120,         // m to start shaking a chase (escape range)
  escapeSec: 5,            // continuous seconds beyond escapeDist to end it
  bustDist: 5,             // m to catch the player and fine again
  bustSec: 1.5,
  bustFine: 120,
  patrolCount: 4,          // active cops near the player at once
  poolSize: 6,             // total pool size (more are pooled, fewer active)
  cameraCount: 8,          // seeded speed cameras across the city
  cameraTriggerRadius: 8,  // m
  cameraCooldownSec: 3,    // debounce per-camera fines
} as const;
```

### 2.7 New `GameEvent`s

Add to `src/core/EventBus.ts`:

```ts
// Police / fines (SERBEST only)
PoliceFine: 'police:fine',        // (amount: number, reason: 'speeding'|'bust'|'camera')
ChaseStarted: 'police:chase-started',
ChaseEnded: 'police:chase-ended',
Wanted: 'police:wanted',          // (level: 0..1, alertedTime: number)
SpeedCameraFlash: 'police:camera-flash',
```

### 2.8 HUD integration (`FreeHud.ts`)

Extend the Phase-1 HUD:

**Fine toast:** on `PoliceFine`, show a brief red/orange notification:
```
🚨 −30 coins
```
or
```
🚨 Ceza −50
```
(left-aligned, safe area, 2–3 sec fade). Reuse the float-text pattern from
`src/ui/Hud.ts` (one toast per fine, stack if rapid).

**Wanted meter:** during a chase (`ChaseStarted`...`ChaseEnded`):
- Small banner or heat bar in the top-right (or center-bottom) showing the cop's
  "heat level" (0..1).
- Listen to `Wanted` events; update the bar's fill/color (`red` at level=1).
- Disappears after `ChaseEnded`.

Keep it minimal: the player should see fines and know a chase is hot, but not be
overwhelmed with UI.

### 2.9 Future hooks

- **Card: `policeIgnore`** (from the brief). Reserve a hook in `Police.ts`:
  ```ts
  const policeIgnoreLevel = Profile.get().cardLevels?.policeIgnore ?? 0;
  const effectiveNoticeRadius = noticeRadius * (1 - 0.3 * policeIgnoreLevel);
  ```
  This reduces the cop's notice radius; later, cards can scale it. For now, log a
  TODO and use the unmodified `noticeRadius`.

### 2.10 Wiring in `boot.ts::startFree()`

```ts
const police = new Police(grid, rng);
scene.add(police.group);

game.onUpdate(dt => {
  vehicle.update(dt);
  traffic.update(dt, vehicle, /* live */ true);
  police.update(dt, vehicle, /* live */ true);  // NEW: police update
  // ...
});

// NOTE: this is the Three.js rewrite — there is no Phaser `scene.on('shutdown')`.
// SERBEST tears down by full page reload (`goMenu()` sets window.location), so
// module-scope listeners die with the page. Still, if Police registers bus
// handlers, expose a `police.destroy()` that `bus.off(...)`s them, and any handler
// wired in `startFree` should be removable — mirror how RUSH's RunController.destroy
// cleans up (PoliceFine / ChaseStarted / ChaseEnded / Wanted / SpeedCameraFlash).
```

Expose `police` on `window.__three` for playtest harness inspection.

### 2.11 Phase-2 acceptance (playtest via `tools/playtest`)

- `npm run typecheck` + `npm run build` green.
- Boot `?mode=free`: cop cars visible patrolling roads (using the cop GLB model,
  distinct from traffic cars).
- Drive at speed > `speedLimit` near a cop → a fine fires (once per cop per
  `fineCooldownSec`); coins drop; red toast appears.
- Chase starts; chase heat meter rises.
- Drive > `escapeDist` away for `escapeSec` → chase ends; meter disappears.
- Alternatively, a cop catches you (within `bustDist`) → bigger fine, brief crash,
  chase ends + resets.
- Speed cameras exist at fixed intersections; crossing over the limit → flash + fine
  (debounced per camera).
- RUSH mode: no police, no fines. Gameplay unaffected.
- Few extra draws (≤4 cop instances vs traffic's 12–22 cars).
- Add a harness `tools/playtest/police.mjs` that approaches a cop at speed →
  asserts a fine fires, coins drop, chase starts/ends.

---

## PHASE 3 — Vehicle Feel & Animation

**Goal:** Make the car feel **real** — apply visual animations driven by the
player's input and motion so steering, leaning, and pitch are **visible** (but do
NOT alter the collision/physics model, so handling is unchanged).

All animations apply to the **model child group** (stored in `Vehicle3D`), never to
`this.object` (the collision transform). This way the car's heading and collision
shape stay true-to-physics.

### 3.1 Asset prerequisite — wheels as separate nodes

The current optimised `car_murphy.glb` has **joined all 4 wheels into one mesh**,
so the front wheels cannot be steered independently. Re-export the car models
preserving wheel nodes:

```bash
npx gltf-transform optimize export_assets/murphy_92_-_low_poly_model.glb \
  src/assets/models/car_murphy.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify false --join false --instance false --flatten false
```

Do the same for `car_cop.glb` (used in Phase 2). The `--join false` and `--instance
false` flags preserve node structure so wheel meshes stay separate.

**Verify:** after export, open `car_murphy.glb` in an editor (e.g., Three.js Inspector)
and confirm wheel nodes still exist with names matching `WheelStock_FL/FR/RL/RR`
(front = `_F*`). Draw call cost rises ~13 → ~18 per car, but steerable wheels are
worth it for the hero car. Traffic cars (pooled instanced meshes) are unaffected.

### 3.2 `ModelLoader.prepareVehicle` — expose wheel pivots & handles

Current `prepareVehicle` returns a holder group with the model as a child. Extend it
to find wheels and set up steering pivots:

**Modify signature & return:**
```ts
export interface VehicleModelOpts {
  targetLength: number;
  extraYaw?: number;
  bodyColor?: number;
  metalnessCap?: number;
  roughnessFloor?: number;
  envMapIntensity?: number;
  contactShadow?: boolean;
  dropMeshes?: RegExp;
}

export interface VehicleModel {
  group: THREE.Group;           // the holder (existing)
  wheels: {
    flPivot: THREE.Group;        // front-left steering pivot
    frPivot: THREE.Group;        // front-right steering pivot
    fl: THREE.Mesh;               // front-left wheel mesh (child of flPivot)
    fr: THREE.Mesh;
    rl: THREE.Mesh;               // rear wheels (no pivot, direct children of model)
    rr: THREE.Mesh;
  };
}

export function prepareVehicle(src: THREE.Object3D, opts: VehicleModelOpts): VehicleModel {
  // ... existing scale/orient/ground/stylise code ...
  // NEW: find and set up wheels:
  const wheels = {
    flPivot: new THREE.Group(),
    frPivot: new THREE.Group(),
    fl: null as any,
    fr: null as any,
    rl: null as any,
    rr: null as any,
  };
  
  model.traverse((o) => {
    if (/wheelstock_fl/i.test(o.name)) {
      wheels.fl = o;
      wheels.flPivot.add(o);
      // centre the wheel in the pivot so rotation.y steers cleanly
      o.position.copy(o.position).multiplyScalar(-1);  // or set to origin
    }
    // ... similar for fr, rl, rr ...
  });
  
  // Name the pivots deterministically for clone lookup:
  wheels.flPivot.name = 'WheelPivotFL';
  wheels.frPivot.name = 'WheelPivotFR';
  
  // Attach to the holder so they're part of the model tree:
  holder.add(wheels.flPivot, wheels.frPivot, wheels.rl, wheels.rr);
  
  // Return holder + wheel references:
  return {
    group: holder,
    wheels,
  };
}
```

**Note:** The `Vehicle3D` will **clone** the template before adding it to the scene,
so `Vehicle3D` resolves its own wheel refs after cloning:
```ts
const template = await loadGLB('car_murphy.glb');
const model = prepareVehicle(template, opts);
const clone = model.group.clone(true);
this.flPivot = clone.getObjectByName('WheelPivotFL');
this.frPivot = clone.getObjectByName('WheelPivotFR');
// ... etc
```

### 3.3 `Vehicle3D` animation layer

In `Vehicle3D.update(dt)`, after computing position/rotation, add visual animations
**to the model holder** (the child of `this.object`). Store a ref to it when the
model is added:

```ts
export class Vehicle3D {
  // ... existing fields ...
  private modelHolder: THREE.Group | null = null;  // the model child
  private flPivot: THREE.Group | null = null;
  private frPivot: THREE.Group | null = null;
  private wheelMeshes: THREE.Mesh[] = [];
  private prevSpeed = 0;

  constructor(...) {
    this.x = startX;
    this.z = startZ;
    this.yaw = startYaw;
    
    if (modelTemplate) {
      const clone = modelTemplate.clone(true);
      this.object.add(clone);
      this.modelHolder = clone;
      
      // Resolve wheel refs from the cloned model:
      this.flPivot = clone.getObjectByName('WheelPivotFL') as THREE.Group;
      this.frPivot = clone.getObjectByName('WheelPivotFR') as THREE.Group;
      // ... find wheel meshes ...
    }
  }

  update(dt: number): void {
    // ... existing speed/steer/throttle/collision logic ...
    
    // NEW: apply visual animations (smooth via damp)
    if (this.modelHolder) {
      this.updateWheels(dt);
      this.updateBodyLean(dt);
      this.updateBodyPitch(dt);
    }
    
    this.prevSpeed = this.speed;
    // ... rest of update ...
  }

  private updateWheels(dt: number): void {
    const { maxWheelAngle, steerLambda, wheelRadius } = VehicleFeel;
    
    // Front-wheel steer (visual only; collision yaw unchanged):
    const targetWheelYaw = this.steerInput * maxWheelAngle;
    if (this.flPivot) {
      this.flPivot.rotation.y = damp(
        this.flPivot.rotation.y,
        targetWheelYaw,
        steerLambda,
        dt
      );
    }
    if (this.frPivot) {
      this.frPivot.rotation.y = damp(
        this.frPivot.rotation.y,
        targetWheelYaw,
        steerLambda,
        dt
      );
    }
    
    // Spin all wheels with travel:
    const spinRate = this.speed / wheelRadius;  // rad/s
    for (const wheel of this.wheelMeshes) {
      wheel.rotation.x += spinRate * dt;
    }
  }

  private updateBodyLean(dt: number): void {
    const { maxLean, leanLambda } = VehicleFeel;
    
    // Lean into turns (roll = -steerInput * speedFactor * maxLean):
    const speedFactor = Math.min(1, this.speed / this.cruiseSpeed);
    const targetRoll = -this.steerInput * speedFactor * maxLean;
    
    if (this.modelHolder) {
      this.modelHolder.rotation.z = damp(
        this.modelHolder.rotation.z,
        targetRoll,
        leanLambda,
        dt
      );
    }
  }

  private updateBodyPitch(dt: number): void {
    const { maxPitch, pitchGain, pitchLambda } = VehicleFeel;
    
    // Pitch from accel/brake:
    const accel = (this.speed - this.prevSpeed) / (dt || 1);  // m/s²
    const clampedAccel = Math.max(-maxPitch / pitchGain, Math.min(maxPitch / pitchGain, accel));
    const targetPitch = -clampedAccel * pitchGain;
    
    if (this.modelHolder) {
      this.modelHolder.rotation.x = damp(
        this.modelHolder.rotation.x,
        targetPitch,
        pitchLambda,
        dt
      );
    }
  }
}
```

### 3.4 New `Balance.VehicleFeel` block

Add to `src/core/Balance.ts`:

```ts
export const VehicleFeel = {
  maxWheelAngle: 0.5,     // rad (≈ 28°), front-wheel visual steer range
  steerLambda: 12,        // wheel-steer smoothing (damp lambda)
  wheelRadius: 0.34,      // m, wheel radius — sets spin rate per m/s
  maxLean: 0.06,          // rad (≈ 3.4°), body roll into turns
  leanLambda: 6,          // body-lean smoothing
  maxPitch: 0.04,         // rad (≈ 2.3°), body pitch under accel/brake
  pitchGain: 0.02,        // (rad) per (m/s²), scales accel→pitch
  pitchLambda: 5,         // body-pitch smoothing
} as const;
```

All values are tuned for subtle, responsive feel (no over-exaggeration). Adjust
`leanLambda` and `pitchLambda` if the animations feel floaty or sluggish.

### 3.5 Chase camera & world scale tuning

The hero car currently sits too low in frame (occluded by the wheel control overlay
on mobile). Adjust the chase camera to frame the car better:

**In `Balance.ts`, `World.cam`:**
```ts
World.cam: { dist: 11.5, height: 6.2, lookAhead: 7, lookHeight: 2.2 }
```
(Previously: `dist: 13, lookAhead: 11`.)

- Reduce `lookAhead` (11 → ~7) so the camera focuses on the car rather than too far
  ahead.
- Reduce `dist` slightly (13 → ~11.5) to bring the car closer (larger in frame).
- Adjust `lookHeight` so the car sits in the lower-third of the viewport but is
  fully visible without clipping the bottom safe area.

**Verify** with a playtest screenshot: the car should be clearly visible, the
steering wheel (if visible) shouldn't occlude the car, and the road ahead should
show enough space to navigate.

**Optional: scale check**
- Car length: 4.6 m (from `World.car.l`).
- Road width (RUSH): 12 m; (SERBEST): 16 m normal, 36 m avenue.
- Block: 60 m (RUSH), 72 m (SERBEST).
- The car should feel proportional to the roads/blocks. If it looks very small or
  large relative to the scenery, tune `targetLength` in `boot.ts::preloadCar`:
  ```ts
  const model = prepareVehicle(murphyGlb, {
    targetLength: 4.6,  // adjust if needed
    // ...
  });
  ```

### 3.6 Files edited for Phase 3

- **`src/assets/models/car_murphy.glb`** & **`car_cop.glb`**: re-export with
  `--join false --instance false` to preserve wheel nodes.
- **`src/world/ModelLoader.ts`**: expose `wheels` from `prepareVehicle` (return
  type becomes `{ group, wheels }`).
- **`src/world/Vehicle3D.ts`**: add `modelHolder` ref, wheel refs, and three methods
  (`updateWheels`, `updateBodyLean`, `updateBodyPitch`); call them from `update(dt)`.
- **`src/core/Balance.ts`**: add `VehicleFeel` block and adjust `World.cam` values.
- **`src/boot.ts`**: possibly adjust `targetLength` in `preloadCar` if scale tuning
  is needed.

### 3.7 Phase-3 acceptance (playtest via `tools/playtest`)

- `npm run typecheck` + `npm run build` green.
- Boot either mode (`?mode=rush` or `?mode=free`).
- **On a turn:** front wheels visibly steer (angle increases with steer input).
  Body leans into the turn.
- **On acceleration:** body pitches slightly (nose lifts, squat effect).
- **On braking:** body pitches the opposite way (nose dips, dive effect).
- **Wheel spin:** wheels rotate with travel speed (faster speed = faster rotation).
- **Framing:** the car sits in the lower-third of the screen, fully visible, with
  good sightlines to the road ahead.
- **Responsiveness:** all animations are smooth (no stuttering) and don't lag input
  (the car still feels arcade-snappy).
- Confirm via playtest screenshots + a harness `tools/playtest/car-model.mjs` that
  exercises turning and takes a screenshot.

---

## File map (new vs edited)

**New:**
- `tools/playtest/police.mjs` — harness: approach a cop at speed → assert fine +
  chase.

**Edited:**
- `src/core/Balance.ts` — add `Police` and `VehicleFeel` blocks; adjust `World.cam`.
- `src/core/EventBus.ts` — add `PoliceFine`, `ChaseStarted`, `ChaseEnded`, `Wanted`,
  `SpeedCameraFlash` events.
- `src/world/Police.ts` — NEW game system (patrol, chase, fine logic, speed cameras).
- `src/world/ModelLoader.ts` — expose `wheels` from `prepareVehicle`; set up steering
  pivots.
- `src/world/Vehicle3D.ts` — add `modelHolder` ref + wheel animation layer
  (`updateWheels`, `updateBodyLean`, `updateBodyPitch`); call from `update(dt)`.
- `src/boot.ts` — wire `Police` in `startFree()` + bus teardown; possibly adjust
  `targetLength`.
- `src/assets/models/car_murphy.glb` & `car_cop.glb` — re-export with wheel nodes
  preserved.
- `src/ui/FreeHud.ts` — add fine toast + wanted meter (Phase 2 UI).

---

## Conventions checklist (every phase)

- **All tunables in `Balance`** — no magic numbers in systems. Both `Police` and
  `VehicleFeel` live in `src/core/Balance.ts`.
- **Systems emit facts on `bus`** — UI/audio/fx subscribe. Unsubscribe via
  `bus.off(...)` on scene shutdown to avoid listener leaks across restarts.
- **`Profile` is the only place coins mutate** — systems read via getters, mutate
  via `addCoins(n)` (negative for fines, clamps ≥0). Emits `CoinsChanged` + persists.
- **Keep draw calls low** — Phase 2 uses ≤4 pooled cop instances (vs 12–22 traffic
  cars). Phase 3 adds wheels and pivots (few extra meshes per vehicle, but no new
  instances). Verify FPS + draw counts in the big city (`?mode=free`, top-right stats).
- **After each phase: `npm run typecheck`, `npm run build`** green; run a playtest
  via `tools/playtest` with evidence (screenshots/state checks). Don't mark done
  without a browser playtest in the running game.
