# AGENTS.md — Delivery Rush

Guidance for Codex when working in this repo. Read `docs/PROJE_TARAMA_VE_PLAN.md`
for the latest full-project scan and the prioritized remaining plan;
`DEVELOPMENT_STATUS.md` for a concise snapshot of what's currently working;
`CODEX_WORK_LOG.md` for what Codex has already built here.

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
Headless-Chrome playtest harnesses (`tools/playtest/`): `npm run
playtest:modes | :loop | :drive | :free-orders | :police | :traffic`.

## Repo layout (top level)
- `src/` … the game (see below).
- `docs/PROJE_TARAMA_VE_PLAN.md` … latest full-repo scan + reachability audit +
  prioritized remaining-work plan (Turkish). Wins on any conflict with other docs.
- `docs/DESIGN_BIBLE.md`, `docs/game-design/` … design/tech bible distilled
  from the Book of Game framework. Background reference — predates the 3D
  pivot in places; defer to live code where it disagrees.
- `docs/OPEN_WORLD_ORDERS_PLAN.md`, `docs/GARAGE_GALLERY_PLAN.md`,
  `docs/PHASE_2_3_POLICE_AND_VEHICLE.md`, `docs/CODE_REVIEW_OPTIMIZASYON.md` …
  feature plans / review notes, mostly already implemented.
- `game-promt/game-promt.md` … the original one-page brief.
- `game-example-foto/` … reference mockups (visual target; predates the 3D
  pivot in places).
- `book-of-game/` … game-agnostic documentation framework (reference only, own
  nested `.git`). Don't edit.
- `CODEX_WORK_LOG.md` … the running log of what Codex has built here and where
  the hand-off to the integration lane happened. Add to it, don't overwrite it.

## Live source architecture (`src/`)
Event-driven, data-driven, single-owner systems.

- `engine/Game.ts` — Three.js renderer, render loop, camera, resize/DPR cap, FPS.
- `render/ChaseCamera.ts` — smoothed, speed-reactive follow camera.
- `world/` — the 3D scene layer: `Grid.ts` (Manhattan grid coord math +
  road-corridor collision), `CityView.ts` (instanced ground/roads/buildings),
  `CityDecor.ts` (SERBEST real-GLB dressing), `Vehicle3D.ts` (drive model +
  steering + visual juice), `Traffic3D.ts` (pooled AI traffic), `Orders3D.ts`
  (RUSH beacons + nav arrow), `Pois.ts` (SERBEST points of interest),
  `Police.ts` (SERBEST patrol/fines/chase), `NavArrow.ts`, `CarPreview.ts`
  (Garage showroom car), `ModelLoader.ts` (GLTF load + prep helpers).
- `ui/` (live) — `DriveControls.ts`, `Hud.ts` (RUSH HUD), `FreeHud.ts` (SERBEST
  HUD + job list), `ModeSelect.ts`, `GarageScreen.ts`, `MarketScreen.ts`. All
  native HTML/CSS overlays mounted into `#ui`.
- `systems/` — `RunController.ts` (RUSH run authority), `RunState.ts` (pure
  score/combo/timer economy), `JobBoard.ts` (SERBEST job/wallet economy),
  `Shop.ts` (pure market pricing/ownership logic — this is the module Codex
  built; see `CODEX_WORK_LOG.md`).
- `core/` — `Balance.ts` (ALL tuning numbers), `EventBus.ts` (`bus` +
  `GameEvent` names), `Palette.ts` (color system).
- `types/index.ts` — shared enums/interfaces (`Direction`, `Steer`,
  `DriveStats`, `VehicleDef`, `Poi`, `Job`, `Order`, `PlayerProfile`…). No
  engine imports.
- `data/` — `vehicles.ts`, `vehicleModels.ts`, `orderKinds.ts`, `pois.ts`,
  `shopItems.ts` (the Market catalog — another Codex-built file).
- `services/` — `interfaces.ts` + `mock/MockServices.ts` + `ServiceLocator.ts`.
  Networking is never hard-coded; gameplay depends only on interfaces.
- `managers/` — `SaveManager.ts`, `ProfileStore.ts` (`Profile` singleton — the
  ONLY place profile is mutated; emits `GameEvent.ProfileChanged`).
- `utils/` — `Rng.ts`, `MathUtils.ts`.
- `boot.ts` — the entry point / composition root. Routes by `?mode=`, preloads
  the vehicle GLB(s), and wires each mode's world + controls + HUD together.
  No runtime scene teardown between modes — each `?mode=` is a fresh page load.

### Dead code — do not build on it
~23 files (~2,971 lines, ~28% of `src/`) are **unreachable from `boot.ts`** —
the 2D Phaser game this project was rewritten from: `main.ts`, `scenes/*`,
`gameplay/*` (`Vehicle`, `CityGrid`, `TrafficSystem`), `systems/OrderSystem.ts`,
`ui/{ControlPad,ControlPadHtml,UiKit}.ts`, `core/{TextureFactory,SceneKeys}.ts`,
`data/{cards,themes}.ts`, `audio/AudioManager.ts`, `effects/Effects.ts`,
`input/Haptics.ts`, `utils/ObjectPool.ts`. The `phaser` dependency exists only
for this dead layer. These files are still physically in `src/` (not yet moved
to a `src/legacy/` quarantine — see `docs/PROJE_TARAMA_VE_PLAN.md`) but are
**not** part of the running game. If a file isn't reachable from `boot.ts`,
treat it as dead reference material, not a place to add code.

## Golden rule for Codex — where you may and may not touch
Codex works in an independent lane, in parallel with Claude Code, on
self-contained slices (see `CODEX_WORK_LOG.md` for the precedent: the
Market/Shop module and the city-decor work were both built this way, then
wired into `boot.ts` later by the integration lane). To keep that safe:

- **Only add new files** for new, isolated systems/data/screens. Prefer pure
  logic + data modules that don't need to reach into the live scene graph.
- **Never edit these — they're the shared/hot integration surface:**
  - `src/boot.ts` (single entry point / mode composition root)
  - `src/core/Balance.ts` (tuning)
  - `src/core/EventBus.ts` (event contract)
  - `src/ui/GarageScreen.ts`, `src/world/CarPreview.ts`
  - Garage, HUD, control, vehicle, camera, and GLB model files in general
- **Don't wire your module into the app.** Routing/mounting a new
  screen/system into `boot.ts` is done later, by hand, in the integration lane
  — that's intentional, not an oversight to fix.
- **Log your work in `CODEX_WORK_LOG.md`** (scope, files touched, boundaries
  respected) so the integration lane knows what's ready to wire in.

## Conventions & gotchas
- **Tune via `core/Balance.ts`** (read-only for you — hand tuning requests to
  the integration lane).
- **Communicate via the bus.** Systems emit facts (`GameEvent.*`); UI/HUD
  subscribe. Keep new modules bus-driven and stateless where possible so
  wiring them in later is low-risk.
- **`Profile`** is the single mutation point for saved data; read via getters,
  never mutate it directly from a new module — surface a callback/event
  instead (see `Shop.ts` / `MarketScreen.ts`'s `onPurchaseRequested` pattern).
- **Services are interface-abstracted** — depend on `services/interfaces.ts`,
  never hard-code a backend call.
- **TS strictness:** `noUnusedLocals/Params` are OFF (rapid dev). `strict` is ON.
- **Coordinate model:** meters, XZ plane, Y up, grid intersections at
  `(col*block, row*block)` — only relevant if you're building something that
  touches world-space, which should be rare for a Codex-lane task.

## Status
The 3D rewrite is complete and playtested end-to-end: RUSH and SERBEST driving
loops, JobBoard economy, garage, police, and market all work and the project
builds green. See `DEVELOPMENT_STATUS.md` for the current-state snapshot and
`docs/PROJE_TARAMA_VE_PLAN.md` for the prioritized remaining plan.
