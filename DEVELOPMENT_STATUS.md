# Delivery Rush — Development Status

**Last updated:** 2026-07-20
**Build state:** `npm run typecheck` and `npm run build` both PASS.

This file is a concise snapshot of what's already working. For the full
reachability audit, dead-code inventory, and the prioritized remaining-work
plan, see **`docs/PROJE_TARAMA_VE_PLAN.md`** — that document is the current
plan of record; if this file and that one ever disagree, the plan doc wins.

## How to resume
```bash
cd C:\Users\Pekka\Desktop\oyundikri
npm run dev          # http://localhost:5173
```
No `?mode=` → the mode picker. `?mode=rush` / `?mode=free` / `?mode=garage` /
`?mode=market` boot straight into a mode (each is a fresh page load, no
in-game menu to get back — a MENÜ/☰ button reloads to the picker). Keyboard
mirrors touch for desktop testing (arrows/WASD to steer, hold to accelerate).
On device/mobile, use `DriveControls` (drag the steering wheel, hold GAZ /
GERİ).

Headless-Chrome playtest harnesses (`tools/playtest/`, or the `playtest`
skill): `npm run playtest:modes | :loop | :drive | :free-orders | :police |
:traffic`.

## What's done
- **3D rewrite** — the game moved from a 2D Phaser prototype to a Three.js
  chase-cam driving game (`src/engine/Game.ts` + `src/world/*`). Config-driven
  Manhattan city grid with real per-building road-corridor collision
  (`Grid.resolveRoads` — wall-slides along building faces, not just an
  outer-ring clamp), instanced low-poly scenery, lane markings, signals.
- **Mode split** — `?mode=rush|free|garage|market` routed from `src/boot.ts`,
  plus a `ModeSelect` picker when no param is given.
- **RUSH** — the tuned 60-second delivery sprint: countdown→running→ended run
  loop (`RunController`), pickup/dropoff beacons + nav arrow (`Orders3D`),
  combo multiplier, coins/score, results panel with retry.
- **SERBEST (free-roam)** — a much larger open city with wide avenues, POI
  buildings (`Pois.ts`), a stop-to-order job board (`JobBoard.ts`) with a
  persistent coin wallet, logarithmic late penalties, daily specials, and a
  live HUD (`FreeHud.ts`).
- **Police** — patrol cars (`Police.ts`) that fine speeding or crashing near
  them and trigger a short, escapable chase; per-road-type speed limits
  (streets vs. wide avenues). All tunables in `Balance.Police`.
- **Vehicle feel/juice** — per-vehicle acceleration-limit drive model
  (`data/vehicles.ts` + `driveStatsAtLevel`) so the roster actually feels
  different; front-wheel steer, body lean, and accel/brake pitch layered on
  the model's visual holder (never on the collision transform).
- **Garage / car gallery** (`?mode=garage`) — rotating showroom car
  (`CarPreview.ts`), stat bars, select/upgrade/unlock wired to `Profile`.
- **Market** (`?mode=market`) — native DOM shop for cards/boosts/cosmetics
  (`MarketScreen.ts` + `Shop.ts` + `data/shopItems.ts`); built by the Codex
  lane and integrated (see `CODEX_WORK_LOG.md`).
- **City decoration** — real GLB assets in SERBEST: a merged/dequantized NY
  skyline ring (baked to a single mesh, 1 draw call) + school landmark
  buildings (`CityDecor.ts`).
- **Real vehicle GLBs** — optimized Sketchfab models (`gltf-transform`,
  meshopt geometry + WebP textures) for the hero sedan, police cruiser, and a
  delivery scooter (the starter vehicle, with a procedural rider);
  `ModelLoader.ts` scales/grounds/tints them and adds a contact-shadow.

## Known gaps / next up
Full detail and priority order in `docs/PROJE_TARAMA_VE_PLAN.md`; headline
items:
- **Dead 2D Phaser code is still physically in `src/`** (~28% of the tree,
  unreachable from `boot.ts`: `main.ts`, `scenes/*`, `gameplay/*`, etc.). The
  planned fix is to move it into `src/legacy/` and exclude it in `tsconfig`,
  then drop the now-unused `phaser` dependency. Not done yet — don't edit
  those files expecting them to run (see `CLAUDE.md`/`AGENTS.md` "Dead code").
- **Audio** — the 3D game is completely silent. No WebAudio wiring exists for
  the 3D layer yet; the old `AudioManager` is Phaser-era dead code, kept only
  as a reference for the eventual rebuild.
- **Scooter courier rider** — the procedural rider figure on the starter
  scooter reads too small/off (flagged by the user); not yet fixed.
- **Perf** — a few identified hot spots, none urgent: per-frame
  `new THREE.Vector3` allocation in `ChaseCamera.update()`, per-frame DOM
  writes in the HUDs, `Traffic3D` instanced-mesh flag churn every frame even
  when nothing changed.
- **Meta screens** — Missions / Leaderboard / Season / Profile / Customization
  are still unbuilt; backing services/data already exist.
- **Tutorial** — no first-run tutorial yet.
- **`Balance.ts` still carries dead 2D blocks** (`Design`, `City`, `Vehicle`,
  `Camera`, `Difficulty`, likely `Design`/`Juice`) mixed in with the live 3D
  ones (`World`, `TrafficRules`, `Nav`, `Econ`, `Police`, `VehicleFeel`,
  `Garage`, `Decor`, `PoiSpawn`, `RUSH_CITY`/`FREE_CITY`, `Run`) — check
  `docs/PROJE_TARAMA_VE_PLAN.md` §1 for which block is which before removing
  or repurposing anything there.

## Reference docs
- `docs/PROJE_TARAMA_VE_PLAN.md` — **primary, current plan**: full scan,
  dead-code audit, prioritized work items, and agent-lane assignments.
- `docs/DESIGN_BIBLE.md`, `docs/game-design/` — original design/tech bible;
  predates the 3D pivot in places, defer to live code where it conflicts.
- `docs/OPEN_WORLD_ORDERS_PLAN.md`, `docs/GARAGE_GALLERY_PLAN.md`,
  `docs/PHASE_2_3_POLICE_AND_VEHICLE.md` — feature plans for SERBEST
  orders/economy, the garage, and police — all implemented; kept for context.
- `docs/CODE_REVIEW_OPTIMIZASYON.md` — code-review notes feeding into the
  consolidated plan.
- `CODEX_WORK_LOG.md` — what the Codex lane has built and its file boundaries.
- `CLAUDE.md` / `AGENTS.md` — architecture + conventions for Claude / Codex.
