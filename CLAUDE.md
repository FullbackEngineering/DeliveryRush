# CLAUDE.md — Delivery Rush

Guidance for Claude Code when working in this repo. Read
`docs/PROJE_TARAMA_VE_PLAN.md` for the latest full-project scan and the
prioritized remaining plan; `DEVELOPMENT_STATUS.md` for a concise snapshot of
what's currently working.

## What this is
**Delivery Rush** — a 3D courier arcade game built with Three.js. `src/boot.ts`
routes into one of four modes via a `?mode=` query param (no param → mode
picker screen):
- `?mode=rush` — the tuned 60-second delivery sprint (countdown clock, combo
  multiplier, coins/score, results screen).
- `?mode=free` — **SERBEST**: a much larger open city, free-roam, stop-to-order
  job board with a persistent coin wallet, traffic + police.
- `?mode=garage` — car gallery/showroom: browse, select, upgrade, unlock.
- `?mode=market` — cards/boosts/cosmetics shop (native DOM overlay).

The player drives with **`ui/DriveControls.ts`**: a draggable analog steering
wheel (bottom-left) + a hold GAZ pedal (bottom-right, accelerate) + GERİ
(reverse) — not an arrow pad. A chase camera follows behind the car. Orders/
jobs are picked up and dropped off at beacons/POIs around the city while
dodging traffic and, in SERBEST, avoiding speeding/crash fines from patrol
police.

- **Stack:** Three.js 0.171 · TypeScript · Vite · mobile-first, portrait.
  **NOT Phaser.** The game was rewritten from a 2D Phaser prototype to 3D
  Three.js; the dead 2D code is still physically in the tree (see "Dead code"
  below) — don't take `Phaser`/`scenes/`/`GameScene` mentions in older docs at
  face value.
- **No shared texture-factory and no wired audio.** Unlike the old 2D build,
  there is no `TextureFactory` — materials/geometry are built per-object in
  code. Real GLB models ARE used for vehicles and SERBEST city decor
  (`src/assets/models/`: hero sedan, police cruiser, delivery scooter + rider,
  NY skyline, school landmarks). **Audio is a known gap — the 3D game is
  currently silent.** The old WebAudio `AudioManager` is dead 2D code, kept
  only as a future reference.
- Order/UI glyphs use emoji.

## Commands
```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # tsc --noEmit && vite build   (both currently PASS)
npm run typecheck  # tsc --noEmit
```
Headless-Chrome playtest harnesses (`tools/playtest/`, see the `playtest`
skill): `npm run playtest:modes | :loop | :drive | :free-orders | :police |
:traffic`.

## Repo layout (top level)
- `src/` … the game (see below).
- `docs/PROJE_TARAMA_VE_PLAN.md` … **read this first.** Latest full-repo scan +
  reachability audit + prioritized remaining-work plan (Turkish). Wins on any
  conflict with other docs.
- `docs/DESIGN_BIBLE.md`, `docs/game-design/` … design/tech bible distilled
  from the Book of Game framework. Background reference — written before/around
  the 3D pivot, so defer to live code and `PROJE_TARAMA_VE_PLAN.md` wherever it
  disagrees.
- `docs/OPEN_WORLD_ORDERS_PLAN.md`, `docs/GARAGE_GALLERY_PLAN.md`,
  `docs/PHASE_2_3_POLICE_AND_VEHICLE.md`, `docs/CODE_REVIEW_OPTIMIZASYON.md` …
  feature plans / review notes, mostly already implemented; useful for *why*
  something is shaped the way it is.
- `game-promt/game-promt.md` … the original one-page brief.
- `game-example-foto/` … reference mockups (visual target; predates the 3D
  pivot in places).
- `book-of-game/` … game-agnostic documentation framework (reference only, own
  nested `.git`). Don't edit.
- `CODEX_WORK_LOG.md` … what the Codex agent lane has built and its file
  boundaries (see "Lanes" below).

## Live source architecture (`src/`)
Event-driven, data-driven, single-owner systems.

- `engine/Game.ts` — Three.js renderer, render loop, camera, resize/DPR cap, FPS.
- `render/ChaseCamera.ts` — smoothed, speed-reactive follow camera.
- `world/` — the 3D scene layer:
  - `Grid.ts` — Manhattan grid coord math (meters) + road-corridor collision
    (`resolveRoads`, wall-slides the car along building faces — real
    per-building collision, not just an outer-ring clamp).
  - `CityView.ts` — ground/roads/buildings/lane markings as instanced meshes.
  - `CityDecor.ts` — SERBEST-only real-GLB dressing (merged NY skyline ring,
    school landmarks), streamed in async so it never blocks the first frame.
  - `Vehicle3D.ts` — acceleration-limit drive model, buffered/analog steering,
    lane collision, wheel-steer/lean/pitch visual juice.
  - `Traffic3D.ts` — pooled AI traffic (signals, car-following, collision).
  - `Orders3D.ts` — RUSH pickup→dropoff beacons + flat ground nav arrow.
  - `Pois.ts` — SERBEST points of interest (restaurants/cafes/homes/offices).
  - `Police.ts` — SERBEST patrol cars: speeding/crash fines, chase state machine.
  - `NavArrow.ts` — SERBEST nav arrow to the active job's target.
  - `CarPreview.ts` — rotating showroom car for the Garage.
  - `ModelLoader.ts` — GLTFLoader + MeshoptDecoder (cached) + `prepareVehicle()`
    (scale/ground/tint/contact-shadow/drop-mesh helpers).
- `ui/` (live) — `DriveControls.ts`, `Hud.ts` (RUSH HUD), `FreeHud.ts` (SERBEST
  HUD + job list), `ModeSelect.ts`, `GarageScreen.ts`, `MarketScreen.ts`. All
  native HTML/CSS overlays mounted into `#ui`, not canvas-drawn UI.
- `systems/` — `RunController.ts` (RUSH: the single run authority — countdown→
  running→ended, spawns orders, combo), `RunState.ts` (pure score/combo/timer
  economy), `JobBoard.ts` (SERBEST: offer/accept/deliver jobs + wallet
  economy), `Shop.ts` (pure market pricing/ownership logic for MarketScreen).
- `core/` — `Balance.ts` (ALL tuning numbers — change gameplay here, not in
  logic; still carries some dead 2D blocks, see "Dead code"), `EventBus.ts`
  (`bus` + `GameEvent` names — a tiny Phaser-free emitter), `Palette.ts`
  (color system).
- `types/index.ts` — shared enums/interfaces (`Direction`, `Steer`,
  `DriveStats`, `VehicleDef`, `Poi`, `Job`, `Order`, `PlayerProfile`…). No
  engine imports.
- `data/` — `vehicles.ts` (roster + `driveStatsAtLevel`), `vehicleModels.ts`
  (GLB spec per vehicle id), `orderKinds.ts`, `pois.ts`, `shopItems.ts`.
- `services/` — `interfaces.ts` + `mock/MockServices.ts` + `ServiceLocator.ts`.
  Networking is never hard-coded; gameplay depends only on interfaces.
- `managers/` — `SaveManager.ts` (localStorage, versioned+migrated),
  `ProfileStore.ts` (`Profile` singleton — the ONLY place profile is mutated;
  emits `GameEvent.ProfileChanged`).
- `utils/` — `Rng.ts` (seeded RNG + daily seed), `MathUtils.ts`.
- `boot.ts` — the entry point. Routes by `?mode=`, preloads the selected
  vehicle GLB (+ cop GLB in SERBEST), sets up lights/env-map, and composes
  each mode's world + controls + HUD + harness hook (`window.__three`). No
  runtime scene teardown between modes — each `?mode=` is a fresh page load.

### Dead code — do not edit expecting it to run
~23 files (~2,971 lines, ~28% of `src/`) are **unreachable from `boot.ts`** —
the deleted-in-spirit 2D Phaser game this was rewritten from: `main.ts`,
`scenes/*` (Boot/Preload/MainMenu/Game/Hud/Results/Garage scenes),
`gameplay/*` (`Vehicle`, `CityGrid`, `TrafficSystem`),
`systems/OrderSystem.ts`, `ui/{ControlPad,ControlPadHtml,UiKit}.ts`,
`core/{TextureFactory,SceneKeys}.ts`, `data/{cards,themes}.ts`,
`audio/AudioManager.ts`, `effects/Effects.ts`, `input/Haptics.ts`,
`utils/ObjectPool.ts`. These have been **quarantined into `src/legacy/`** and
excluded from compilation (`tsconfig` `exclude: ["src/legacy"]`), and the
`phaser` dependency — which only that dead layer imported — has been removed
from `package.json`. `src/legacy/` is kept as reference (some pieces, e.g.
audio/haptics/effects, may be adapted to the 3D game later), but it is not
built or bundled. Don't edit anything under `src/legacy/` expecting it to run.

## Conventions & gotchas
- **Tune via `core/Balance.ts`.** Don't sprinkle magic numbers in systems.
- **Communicate via the bus.** Systems emit facts (`GameEvent.*`); UI/HUD
  subscribe. `RunController` (RUSH) and `boot.ts`'s SERBEST composition are the
  authorities that turn events into state changes. Call `bus.off(...)` on
  teardown for anything that can be constructed more than once per page load
  (e.g. Garage next/prev) — full page reload between `?mode=` values means this
  matters less than it used to, but the discipline still applies within a mode.
- **`Profile`** is the single mutation point for saved data; read via getters.
- **Services are interface-abstracted** — swap `MockServices` for a real
  backend with zero gameplay changes.
- **TS strictness:** `noUnusedLocals/Params` are OFF (rapid dev). `strict` is
  ON. `import.meta.env` needs `src/vite-env.d.ts`.
- **Coordinate model:** meters, XZ plane, Y up. Grid intersections at
  `(col*block, row*block)`; `Grid.resolveRoads()` confines the car to road
  corridors and wall-slides along building faces.
- **Multi-agent lanes:** `boot.ts` / `core/Balance.ts` / `core/EventBus.ts` are
  the Opus/Claude integration lane — the composition root + tuning + event
  contract everyone else depends on. Codex (a separate coding-agent lane) only
  adds new, self-contained files and never touches those three, or the
  garage/HUD/control/vehicle/camera/GLB-model files — see `AGENTS.md` and
  `CODEX_WORK_LOG.md` for exactly what it's built and where the boundary is.

## Status
The 3D rewrite is complete and playtested end-to-end: RUSH and SERBEST driving
loops, JobBoard economy, garage, police, and market all work and the project
builds green. See `DEVELOPMENT_STATUS.md` for the current-state snapshot and
`docs/PROJE_TARAMA_VE_PLAN.md` for the prioritized remaining plan (dead-code
cleanup, perf hot spots, audio, a scooter-rider visual fix, meta screens).
