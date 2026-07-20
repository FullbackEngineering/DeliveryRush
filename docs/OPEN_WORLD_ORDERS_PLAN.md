# Open-World Orders, Economy, Police & Vehicle Feel — Implementation Plan

**Status:** design/hand-off doc. Last updated 2026-07-19.
**Scope:** turn SERBEST (free mode) from a bare open city into a living courier
world: physical destination buildings (restaurants / kiosks / cargo depots) you
drive to, a job board that lists orders tied to those buildings, a persistent
wallet economy with logarithmic late-penalties + daily specials, a police/fines
layer, and real-car vehicle juice (steering front wheels, body lean, accel pitch).

This doc is prescriptive: it names the exact files, data shapes, `Balance` keys,
bus events and acceptance checks so a coding agent can implement it phase-by-phase
without re-deriving the architecture. Read `CLAUDE.md` and `DEVELOPMENT_STATUS.md`
first; obey the repo conventions (tune in `core/Balance.ts`, communicate via the
`bus`, always `bus.off(...)` on teardown, `Profile` is the only save mutation point).

---

## 0. Where this plugs into the current code

Grounding facts (verified in-repo, 2026-07-19):

- **Modes** are routed in `src/boot.ts`: `startRush()` (tuned 60s sprint) and
  `startFree()` (large `FREE_CITY`, free-roam, no run gate). Both build:
  `Grid` → `CityView` → `Vehicle3D` → `Traffic3D` → `ChaseCamera` + controls.
- **Orders today** (`src/world/Orders3D.ts`) own ONE `Order`, spawn a random
  pickup→dropoff on grid *intersections*, show beacons + a flat nav arrow, run a
  per-order timer, and emit `OrderSpawned/PickedUp/Delivered/Expired/Timer` on the
  bus. `REACH = 13m` registers pickup/dropoff.
- **Run authority** (`src/systems/RunController.ts`) converts order events into
  `RunState` economy (RUSH only). SERBEST currently has NO order/economy wiring.
- **City** (`src/world/CityView.ts`) builds everything as instanced meshes in a
  double `for (c,r)` plot loop. POI buildings hook in here (same loop / a parallel
  pass) so they’re part of the world, not floating props.
- **Grid** (`src/world/Grid.ts`): `nodePos(col,row)→{x,z}`, `halfAt(line)`,
  `resolveRoads()`. `FREE_CITY` = 24×24, block 72, road 16, avenues width 36 every 6.
- **Wallet**: `Profile.addCoins(n)` / `spendCoins(n)` (persistent, versioned save,
  emits `CoinsChanged` + `ProfileChanged`). Coins are the currency. There is no
  “debt”; `addCoins` clamps at 0 — penalties must be allowed to reduce coins (they
  are, via `addCoins(-n)` which clamps at 0; fine for v1).
- **Model loading** (`src/world/ModelLoader.ts`, added this session): `loadGLB(url)`
  + `prepareVehicle()` (scale/orient/ground/stylise). Optimised GLBs live in
  `src/assets/models/` (`car_murphy.glb`, `car_cop.glb`, `bike.glb`).

**Design rule for SERBEST:** it is *persistent-wallet, open-ended* (no countdown).
Earnings/penalties go straight to `Profile.coins`. RUSH stays exactly as-is.

---

## PHASE 1 — Open-world order system (POIs + job board + economy)

### 1.1 Points of Interest (POIs) — the destinations

A POI is a fixed building in the world you drive to. Types (data-driven):

| type       | glyph | role                     |
|------------|-------|--------------------------|
| restaurant | 🍔🍕🍣 | food pickup source        |
| cafe/büfe  | ☕🥤  | drink/snack pickup source |
| cargo depot| 📦   | parcel pickup source       |
| home/office| 🏠🏢 | drop-off destinations      |

**New data file `src/data/pois.ts`:**
```ts
export type PoiType = 'restaurant' | 'cafe' | 'cargo' | 'home' | 'office';
export interface PoiDef { type: PoiType; name: string; emoji: string; color: number; isSource: boolean; }
export const POI_DEFS: PoiDef[] = [ /* ~12 named venues, e.g.
  { type:'restaurant', name:'Pizza Palace', emoji:'🍕', color:Palette.orange, isSource:true }, ... */ ];
```

**New system `src/world/Pois.ts`** (mirrors `Orders3D` style):
- `class Poi { def; col; row; x; z; marker: THREE.Group }`.
- `class PoiSystem { readonly group; list: Poi[]; place(grid, rng): void; nearest(x,z, filter?): Poi|null; reachAt(x,z): Poi|null (within REACH) }`.
- **Placement**: pick N plots (e.g. 18) spread across `FREE_CITY`, snap each to the
  road-facing edge of its plot so the entrance sits on the sidewalk. Reuse the
  `CityView` plot math (`x0/x1/z0/z1`, `halfAt`) — expose a
  `Grid.plotCenter(col,row)` helper or a shared `cityPlots(grid)` util so `CityView`
  and `PoiSystem` agree on plot positions. **Do NOT overlap a POI with a random
  building** — either reserve those plots (skip them in `CityView.buildBlocks`) or
  render the POI’s own landmark building on that plot.
- **Marker**: a low-poly landmark (awning + sign board) + a floating billboarded
  icon (emoji on a `CanvasTexture` sprite) + a soft ground ring, colour per type.
  Always visible (dim) so the city reads as full of places; the *active* job’s
  pickup/dropoff POIs pulse brighter (reuse `Beacon3D` styling).
- Keep it cheap: markers as a few instanced meshes + one sprite each (≤~2 draws
  per POI icon). Landmark buildings can be instanced with the city.

### 1.2 Jobs (open-world orders)

**New type in `src/types` (extend, don’t break `Order`):**
```ts
export interface Job {
  id: number;
  kind: OrderKind;         // from data/orderKinds.ts (emoji/label/color)
  source: Poi;             // where you pick up
  dest: Poi;               // where you deliver
  distanceM: number;       // straight/manhattan metres source→dest
  pay: number;             // coins on on-time delivery
  timeLimit: number;       // seconds from acceptance
  penaltyBase: number;     // coins basis for lateness (see formula)
  special: boolean;        // daily special (⭐ boosted pay, low penalty)
  state: 'offered' | 'active' | 'toPickup' | 'toDropoff' | 'done' | 'failed';
}
```

**New system `src/systems/JobBoard.ts`** (pure logic, engine-agnostic like RunState):
- Holds `offered: Job[]` (regenerated periodically / on delivery) and `active: Job|null`.
- `refresh(pois, rng, now)`: build ~5–7 offered jobs from random source→dest POI
  pairs; compute `distanceM`, `pay`, `timeLimit`, `penaltyBase` from `Balance.Econ`
  (below). Mark 1–2 as `special` using `dailySeed()` so specials are stable per day.
- `accept(id)`: single-order model → sets `active`, state `toPickup`; ignore if one
  is already active. Emits `JobAccepted`.
- `pickup()` / `deliver(now)` / `fail()`: state transitions; `deliver` computes
  on-time vs late, returns `{ pay, penalty, net }`.
- Emits new bus events: `JobsRefreshed(offered)`, `JobAccepted(job)`,
  `JobPickedUp(job)`, `JobDelivered(job, {pay,penalty,net})`, `JobFailed(job)`,
  `JobTimer(job, secondsLeft, fraction)`.

### 1.3 Economy (add to `core/Balance.ts` as `export const Econ`)

```ts
export const Econ = {
  payBase: 40,            // flat coins
  payPerKm: 55,           // coins per km of distance
  payComboStep: 0.15,     // +15% per chained on-time delivery (streak), cap below
  payComboCap: 2.5,
  timePerKm: 42,          // seconds of limit granted per km (tune for feel)
  timeMin: 25,            // floor on a job's time limit
  // Logarithmic late penalty: grows fast then flattens, never ruinous.
  //   penalty = round(min(pay, penaltyK * ln(1 + secondsLate) )) * (special ? specialPenaltyMul : 1)
  penaltyK: 22,
  specialPayMul: 1.8,     // daily special pay boost
  specialPenaltyMul: 0.3, // daily special penalty reduction
  refreshEverySec: 25,    // re-roll offered jobs on this cadence (when none active)
  offeredCount: 6,
} as const;
```
- **On-time delivery** → `Profile.addCoins(pay)`, streak++ (streak boosts next
  `pay` via `payComboStep`, capped `payComboCap`).
- **Late delivery** → still pays `pay`, but `Profile.addCoins(-penalty)`; streak resets.
- **Failed/abandoned** (timer 0 or cancel) → optional small penalty, streak resets.
- `distanceKm = distanceM / 1000`; use manhattan block distance × block metres.

### 1.4 Navigation & interaction in the world

- Reuse `Orders3D`’s `NavArrow` (extract it to `src/world/NavArrow.ts` so both
  RUSH `Orders3D` and SERBEST can share it — no logic change, just move + export).
- Active job: nav arrow + bright beacon point at `source` (state `toPickup`), then
  at `dest` after pickup (`toDropoff`). `REACH`-radius arrival at the POI triggers
  pickup/deliver (same 13 m as today).

**Stop-to-order (PRIMARY interaction — how orders get listed).**
You physically drive up to a source POI (restaurant/kiosk/cargo) and **come to a
stop** to see its orders. Rules:
- **Trigger:** player within the POI’s `orderZoneRadius` (≈ `REACH`, 13 m) AND
  `vehicle.speedKmh < stopThreshold` (e.g. 4 km/h) → **open that POI’s order-list
  panel** (a slide-up in `FreeHud`).
- **Drive-through does nothing:** if you’re inside the zone but still moving above
  `stopThreshold`, the panel **never opens** and no animation plays — it must not
  interrupt driving. Only stopping opens it.
- **Hysteresis:** once open, the panel stays until you drive out of the zone or tap
  close/accept. Leaving + returning + stopping re-opens it. Don’t re-trigger every
  frame while parked (open once, then idle).
- **Panel content:** the POI header (emoji + name) + 2–4 orders *sourced at this
  POI*, each row: dest POI · distance km · 🪙pay · ⏱time · ⚠️penalty (⭐ if special).
  Tap a row = **accept** → panel closes, nav arrow + beacon guide you to the dest.
- **Single active order:** if a job is already active, the panel may still open but
  accepting is disabled (show “önce teslimatı bitir”).
- **World hint:** when moving *near* a source POI (marker in range), pulse its
  marker + show a small floating “🛑 Dur & sipariş al” prompt so the player knows
  to stop. Hide it once stopped/opened or once out of range.
- `JobBoard` therefore groups offered jobs **per source POI** (each source exposes
  its own small list); `board.ordersAt(poi)` returns that POI’s current offers.
- The 📋 global board button (§1.5) becomes an **optional overview/shortcut**, not
  the main path — the main path is drive-up-and-stop.
- New tunables (add to `Balance`, e.g. the existing `Nav`/`Econ` block):
  `orderZoneRadius: 13`, `stopThreshold: 4` (km/h).

### 1.5 SERBEST HUD (extend the free-roam chrome in `boot.ts`/new `src/ui/FreeHud.ts`)

Promote the inline `makeFreeHud` into `src/ui/FreeHud.ts` and add:
- **Wallet pill** (top): 🪙 live `Profile.coins` (listen `CoinsChanged`).
- **📋 Job Board button** → slide-up panel listing `offered` jobs, each row:
  `kind emoji · "Source → Dest" · distance km · 🪙pay · ⏱time · ⚠️penalty`, ⭐ if
  special. Tap a row = accept (disabled while a job is active). Native DOM, same
  style language as the existing overlay (rounded dark cards, safe-area insets).
- **Active job card** (when a job is active): source/dest, live countdown bar
  (listen `JobTimer`), URGENT tint under ~5 s; a small “iptal” (cancel) button.
- **Floating reward text** on delivery: `+pay` green, `-penalty` red (reuse the
  HUD’s float-text pattern from `src/ui/Hud.ts`).

**Mobile portrait sizing (CRITICAL UX — controls must not hide the car).** The
current drive controls are far too large (wheel ~340 px, gas ~230 px on a ~390 px
viewport) and occlude the car. Target sizes for a portrait phone (scale with
`clamp()`/`vw`/`vmin`, never fixed huge px):
- **Steering wheel:** diameter `clamp(120px, 33vw, 168px)`, bottom-left, ~14px inset.
- **Gas (GAZ):** `clamp(96px,26vw,132px)` wide × ~`clamp(120px,30vw,150px)` tall,
  bottom-right, ~14px inset. Slightly translucent (~0.9) so it doesn’t dominate.
- **Reverse (GERİ):** small, ~`clamp(58px,15vw,80px)`, tucked just left of / above GAZ.
- Keep a **clear central gap** at the bottom between wheel and gas so the car
  (which sits low in frame) stays visible.
- **Slide-up panels** (job board / stop-to-order list): `max-height: 52vh`,
  internal scroll, a dim tap-to-close backdrop — NOT full-screen. Rounded top.
- **Minimap:** `clamp(96px,28vw,128px)` square, top-right under the wallet pill.
- **Top bars/pills:** compact, single row, respect `env(safe-area-inset-*)`.
- Verify on a 390×844 viewport (the harness default) that the car is clearly
  visible and no control/panel covers the centre of the road.

### 1.6 Wire it in `boot.ts::startFree()`

```
const pois = new PoiSystem(); pois.place(grid, rng); scene.add(pois.group);
const board = new JobBoard(pois, rng);
const arrow = new NavArrow(); scene.add(arrow.group);
const freeHud = new FreeHud(ui, board);   // owns the board button + active card
board.refresh(...); // initial offers
game.onUpdate(dt => {
  vehicle.update(dt); traffic.update(...); chase.update(...);
  board.tick(dt, vehicle.x, vehicle.z); // arrival checks, timer, refresh cadence
  arrow.update(...);                     // point at active target
});
```
Expose `board`/`pois` on `window.__three` for the playtest harness.

### 1.8 Minimap / map (open-world navigation)

An always-on **minimap** so the player can find POIs and the active job across the
big `FREE_CITY`. Part of `FreeHud.ts` (same DOM overlay).

- **Widget**: a rounded ~120–140 px square, top-right, respecting
  `env(safe-area-inset-*)`, sitting under the wallet pill. A `<canvas>` (DPR-scaled)
  redrawn ~12 fps (throttle — not every frame) via a `render(state)` call from the
  game loop.
- **Contents** (whole-city fixed projection: world XZ → canvas px via
  `worldW/worldD`):
  - dark rounded background; **avenues** drawn as brighter/thicker lines (use
    `grid.isAvenue(line)` + `halfAt`), normal streets faint or omitted for clarity;
  - **POI dots** coloured per `PoiDef.color`; the active job’s **source** (orange)
    and **dest** (green) drawn larger + pulsing;
  - **player** as a triangle at its mapped position, rotated to `vehicle.yaw`;
  - optional thin line player→active target.
- **Tap to expand** (stretch): tapping the minimap opens a larger full-screen map
  overlay (same draw routine, bigger canvas) with POI labels; tap to close.
- Cheap: one canvas, no per-POI DOM nodes; project points with a shared
  `worldToMap(x,z)` helper. Keep it legible on a phone (dots ≥4 px, player ≥7 px).
- Expose nothing extra for the harness beyond what §1.6 already exposes; a
  screenshot check that the minimap shows the player + POIs is enough.

### 1.7 Phase-1 acceptance (playtest via `tools/playtest`)

- `npm run typecheck` + `npm run build` green.
- Boot `?mode=free`: POI landmarks + icons visible around the city; ~18 POIs, no
  POI inside a road, no z-fighting, draws stay < ~40 in the big city.
- Job board lists ≥5 jobs with sane pay/time/distance; ⭐ specials present.
- Accept → drive to source (arrow+beacon) → pickup fires → drive to dest → deliver
  fires → `Profile.coins` increases by `pay`; late delivery reduces coins by the
  log penalty; HUD wallet + float text update.
- No bus-listener leaks (systems `off()` their handlers if the world is torn down).
- Add a harness `tools/playtest/free-orders.mjs` that accepts a job, auto-drives to
  source then dest, and asserts pickup+deliver+coins-changed.

---

## PHASE 2 — Police, speeding & fines

Use the **`car_cop.glb`** model (already optimised) for patrol cars.

- **Speed rule** (`Balance.Police`): `speedLimit` (km/h) on normal streets;
  avenues allow higher. Exceeding it near a police unit risks a fine.
- **Patrol police** (`src/world/Police.ts`): a small pool of cop cars (cop model)
  that idle/patrol on roads. If the player speeds within `noticeRadius` OR crashes
  into traffic within range → **fine** (`Profile.addCoins(-fine)`) + a short
  **chase**: the nearest cop accelerates toward the player; escape by getting
  `escapeDist` away for `escapeSec`. Emits `PoliceFine(amount)`, `ChaseStarted`,
  `ChaseEnded`. HUD: a red “🚨 fined -X” toast + a chase banner/heat bar.
- **Speed cameras** (cheap alt/complement): flash + fine when you pass an
  intersection over the limit; seeded positions.
- Keep v1 minimal & fair: fines small, chase short, clear feedback. Tune all in
  `Balance.Police`. Cards `policeIgnore` (from the brief) can later reduce heat.
- Acceptance: driving over the limit past a cop fines you once (debounced), a
  chase starts and can be escaped, coins reflect the fine, no perf regression.

---

## PHASE 3 — Vehicle feel & animation (juice)

The user wants the car to *feel real*: steering front wheels, body lean into
turns, pitch under accel/brake. All visual — apply to the **model holder**, never
to the collision transform, so physics/handling are unchanged.

### 3.1 Asset prerequisite — keep the wheels as separate nodes
The current optimised `car_murphy.glb` **joined all 4 wheels into one mesh** (the
`--join`/instance passes merge by material), so front wheels can’t be steered.
Re-export the cars preserving node structure:
```
npx gltf-transform optimize export_assets/murphy_92_-_low_poly_model.glb \
  src/assets/models/car_murphy.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify false --join false --instance false --flatten false
```
(Do the same for `car_cop.glb`.) A few more draw calls (~13→~18) is an acceptable
trade for steerable wheels on the hero car. Verify wheel node names still contain
`WheelStock_FL/FR/RL/RR` (front vs rear identifiable by `_F*`).

### 3.2 `ModelLoader.prepareVehicle` — expose wheel handles
Return `{ group, wheels: { fl,fr,rl,rr } }` (or attach `group.userData.wheels`),
found by name match. Keep the existing scale/orient/ground/stylise/dropMeshes
behaviour. Front wheels get a parent pivot so steering (Y) and roll (X) compose
cleanly (steer the pivot about Y, spin the wheel mesh about its axle X).

### 3.3 `Vehicle3D` — drive the animation from state
In `update(dt)`, after computing `speed`, `steerInput`, `yaw`, drive a smoothed
visual layer on the model holder (`damp` toward targets, `Balance.VehicleFeel`):
- **Front-wheel steer**: `wheelPivot.rotation.y = damp(→ steerInput * maxWheelAngle)`
  (`maxWheelAngle ≈ 0.5 rad`).
- **Wheel roll**: all wheels `rotation.x += (speed / wheelRadius) * dt` (spin with
  travel; visually sells motion).
- **Body lean (roll)**: `holder.rotation.z = damp(→ -steerInput * (speed/cruise) * maxLean)`
  (`maxLean ≈ 0.06 rad`), lean *into* the turn.
- **Pitch (accel/brake squat/dive)**: track `accel = (speed - prevSpeed)/dt`;
  `holder.rotation.x = damp(→ -clamp(accel) * pitchGain)` (nose lifts on accel,
  dips on brake). Keep tiny (`≤0.04 rad`).
- Optional: subtle body bob at idle, exhaust puff on throttle-start. Low priority.
Add `Balance.VehicleFeel = { maxWheelAngle, wheelRadius, wheelSpinScale, maxLean,
leanLambda, pitchGain, pitchLambda }`.

### 3.4 Chase camera & world scale (“araba/yol endeksi”)
- The hero car currently sits too low in frame (occluded by the wheel control).
  Reduce `World.cam.lookAhead` (11 → ~7), maybe `dist` 13 → ~11.5 and
  `lookHeight` so the car sits in the lower-third but fully visible; retune with
  the playtest screenshot.
- Sanity-check scale: car length 4.6 m vs `roadWidth` (RUSH 12, FREE 16) and block
  (60/72). If the car feels small/large relative to lanes, tune `targetLength` in
  `boot.ts::preloadCar` and/or road widths in `Balance`. Verify with a screenshot.
- Acceptance: on a turn the wheels visibly steer and the body leans; accel/brake
  pitches slightly; the car is clearly visible and well-framed while driving; feel
  stays responsive (no float, no lag). Confirm via `tools/playtest` screenshots +
  `car-model.mjs`.

---

## File map (new vs edited)

**New:** `src/data/pois.ts`, `src/world/Pois.ts`, `src/world/NavArrow.ts`
(extracted), `src/systems/JobBoard.ts`, `src/ui/FreeHud.ts`,
`src/world/Police.ts` (P2), `tools/playtest/free-orders.mjs`.
**Edited:** `src/core/Balance.ts` (`Econ`, `Police`, `VehicleFeel`),
`src/core/EventBus.ts` (new `Job*` / `Police*` events), `src/types/*`
(`Job`, `Poi` shapes), `src/world/CityView.ts` (reserve POI plots / share plot
util), `src/world/Grid.ts` (plot helper), `src/world/ModelLoader.ts` (wheel
handles), `src/world/Vehicle3D.ts` (animation layer), `src/boot.ts`
(`startFree` wiring, cam tune), `src/assets/models/*` (re-export wheels-separate).

## Conventions checklist (every phase)
- All tunables in `Balance` — no magic numbers in systems.
- Systems emit facts on `bus`; UI/audio/fx subscribe; `bus.off()` on teardown.
- `Profile` is the only place coins mutate; read via getters.
- Keep draw calls low (instancing); verify FPS/draws in the big city.
- After each phase: `npm run typecheck`, `npm run build`, and a `tools/playtest`
  run with screenshots. Don’t mark done without a browser playtest.
