# Delivery Rush — Development Status & Plan

**Last updated:** 2026-07-19
**Build state:** ✅ `npm run typecheck` passes · ✅ `npm run build` passes

## Session 2026-07-19 (d) — controls, per-vehicle accel, Phase 2 police, city decor
User resolved the "won't run on phone" issue themselves; directed Opus to do the
coding and delegate to Sonnet only on request.
- **Drive controls resized** (`ui/DriveControls.ts`) — wheel/GAZ/GERİ were too big
  and hid the car; now responsive `clamp()` sizing (wheel ~117px, gas ~98×113 on a
  390px phone) with a clear central gap so the car stays visible. Verified.
- **Per-vehicle acceleration** — `Vehicle3D` swapped the near-instant exponential
  `damp` for a real **acceleration-LIMIT** (constant m/s² ramp); each car now has
  `drive: { topSpeed, accel, turn }` (`data/vehicles.ts` + `driveStatsAtLevel`),
  coast/brake rates in `Balance.World`. Starter ≈65 km/h/~3s to top → Hyper ≈126
  km/h/punchy. Differentiates the roster for the garage. Measured the ramp.
- **Hero car scaled up** — `boot.ts::preloadCar` `targetLength` 4.6→5.8 (read small).
- **Phase 2 — Police/speeding/fines DONE** (Sonnet agent, verified `playtest:police`):
  `world/Police.ts` — patrol cop cars (`car_cop.glb`, flashing lights), speeding past
  one on a normal street (limit 66; avenues 100) or crashing beside one → coin fine +
  short escapable chase; HUD banner + red speed pill + fine float. `Balance.Police`.
- **Garage/car gallery STARTED** (Sonnet agent, `?mode=garage`): `ui/GarageScreen.ts`
  + `world/CarPreview.ts` (rotating 3D car, stat bars, select/upgrade/unlock),
  `tools/playtest/garage.mjs`. **User stopped the agent mid camera-polish** — files
  compile/build but the gallery is NOT final-verified; finish on request.
- **City decoration from real GLB assets** (`world/CityDecor.ts`, SERBEST): user
  dropped building GLBs in `export_assets/`; optimised the good ones →
  `src/assets/models/`. **NY skyline** ring around the city (baked+merged into ONE
  silhouette mesh = 1 draw), **school landmarks** on reserved plots (look great).
  **Kit buildings DISABLED** (`Decor.kitCount:0`) — the `free_city` GLB is a baked
  demo scene, strips to thin degenerate quads, not usable as standalone buildings.
  - **Skyline bug fixed:** the merge baked the meshopt-**quantised/normalised** int
    positions straight through `applyMatrix4`, clamping every vertex to ±1 → the whole
    ring collapsed into a 2-unit blob at the origin (invisible — this is why the user
    "saw no change"). Fix: transform each vertex via `Vector3.fromBufferAttribute`
    (dequantises) into a fresh Float32 buffer. Now the ring spans x/z −211→1958,
    height 0→140m. Material `fog:false` + `skylineHeight 140` so it reads as a crisp
    downtown backdrop on the horizon from inside the city (down avenues), not just at
    edges. Verified via screenshots; running draws ~33.
  - **Known:** `playtest:free-orders` now intermittently FAILS at the scripted
    "auto-drive to source POI" step (car stops ~29m short). Decor doesn't touch
    navigation/POIs/roads; likely the **police chase derailing the test driver** (the
    harness floors the car → speeds → fined/chased, e.g. 500→440). Harness needs to
    account for police, or disable police for that test. Not a decor regression.

## Session 2026-07-19 (c) — real car GLB assets + open-world plan
- **User dropped 3 Sketchfab GLBs in `export_assets/`**: `murphy_92` (sedan, 16.4K
  tris), `murphy_92_cop_cruiser` (police livery, 16.7K), `checkers_sixty60_bike`
  (205K tris ⚠️). Raw total ~28 MB (bloat = 2K PNG textures).
- **Optimised offline** with `@gltf-transform/cli` (new devDep) → `src/assets/
  models/`: `car_murphy.glb` 1.6 MB, `car_cop.glb` 1.6 MB, `bike.glb` 0.6 MB
  (meshopt geom + 1k WebP; bike simplified 205K→38K). Total ~4 MB.
- **New `src/world/ModelLoader.ts`**: `loadGLB` (GLTFLoader + MeshoptDecoder, cached)
  + `prepareVehicle()` — uniform-scales to target length, aligns nose to +Z,
  grounds wheels, **stylises PBR toward the matte world** (metalness cap, roughness
  floor, low envMapIntensity, palette-tinted body), adds a fake **contact-shadow**
  disc, and can **drop degenerate meshes**.
- **`Vehicle3D`** takes an optional `modelTemplate` (clones it; falls back to the
  procedural box car). **`boot.ts`** adds a `RoomEnvironment` PMREM env-map (so the
  PBR metals aren’t black), preloads the car before spawning, passes it to both modes.
- **Bugs found & fixed via headless screenshots** (`tools/playtest/car-model.mjs`):
  (1) car faced backwards → `extraYaw: Math.PI`; (2) material-array bug made
  single-material meshes invisible → shape-preserving clone; (3) **car floated 0.6 m**
  because a broken `Numberplate_Front` mesh spanned 0–2.15 m and forced grounding to
  the wrong min → `dropMeshes: /numberplate_front/i` (height 2.15→1.29 m, wheels on road).
- **Result:** yellow sedan sits correctly on the road, matte, integrated, ~13–22 draws,
  no console errors. Verified in browser.
- **NEXT (planned in `docs/OPEN_WORLD_ORDERS_PLAN.md`):** open-world SERBEST order
  system — POI buildings (restaurants/kiosks/cargo) you drive to, a job board (single
  active order), persistent wallet economy w/ **log late-penalties** + daily specials;
  then **police/fines** (uses cop model); then **vehicle juice** (steer front wheels —
  needs car re-exported with `--join false` — body lean, accel pitch, chase-cam framing).
  Handing Phase 1 to a Sonnet coding agent.
- Known residual: chase cam frames the hero car a bit low (addressed in plan Phase 3).

## Session 2026-07-19 (b) — game modes, bigger city, building collision
- **Building collision FIXED** (was: car drove straight through blocks). Root cause:
  `Vehicle3D` only clamped to the outer ring — no per-building collision at all.
  Added road-corridor collision `Grid.resolveRoads()`: the Manhattan grid's cells
  are solid; the car must stay within a road's half-width of a grid line and now
  **wall-slides** along building faces instead of passing through. Verified in a real
  browser (0/80 off-road samples under aggressive steering, both cities).
- **Mode split (per user).** New `ModeSelect` screen (HTML overlay) at boot; routing
  by `?mode=rush` / `?mode=free` (picker reloads into a clean world — no teardown).
  - **RUSH** = the existing tuned 60-second sprint (unchanged feel).
  - **SERBEST** = a much larger open city you free-drive (orders/economy next pass).
  Rush results now has a **MENÜ** button back to the picker; Serbest has a top bar
  (badge + live km/h + ☰ Menü).
- **City is now config-driven + supports WIDE AVENUES.** `CityConfig` presets
  `RUSH_CITY` (14×14, road 12) and `FREE_CITY` (24×24, block 72, road 16, **avenues
  width 36 every 6 lines** incl. a wide outer belt). `Grid` takes the config and
  exposes `halfAt(line)` (avenue-aware); `CityView` fits sidewalk plots between the
  variable-width roads (wide gaps = avenues, with lane-divider markings) and
  `Traffic3D` lanes scale to each road's width. Draw calls stay ~22 in the big city.
- **Next (agreed):** build the **SERBEST job board** — a 📋 order list you accept ONE
  job at a time, showing km / pay / time / late-penalty; a wallet economy with
  **logarithmic penalties** + **daily special offers** (high pay, low penalty). THEN
  police / speeding fines / traffic officers. (User picked "önce harita & mod seçimi"
  for this turn, job-board single-order model for the economy.)
- New check: `npm run playtest:modes` (`tools/playtest/three-modes.mjs`) — verifies
  picker + drives/collision in both cities. Old three-* scripts now boot `?mode=rush`.

## Session 2026-07-19 — 3D loop complete + beautification pass + new controls
Built on the Three.js rewrite. **Phase 5 (playable 60s loop in 3D) DONE:**
- `src/world/Orders3D.ts` — pickup→dropoff beacons (pulsing ground ring + billboard
  light beam + spinning gem, geometry-only so no emoji-font reliance) and a **flat
  ground guide-arrow** ahead of the car (a floating 3D arrow blobbed in the camera
  when facing toward/away; a flat arrow on the road never does).
- `src/ui/Hud.ts` — HTML/CSS overlay: coins·timer·score bar, order card w/ its own
  countdown + URGENT, combo popup, floating reward text, 3-2-1 countdown, results
  panel with **TEKRAR** (retry). Pure bus-listener; owns no state.
- `src/systems/RunController.ts` — the single authority (ex-GameScene role): owns
  RunState, runs countdown→running→ended, spawns next order on deliver/expire,
  breaks combo on Crash, restart. `boot.ts` composes it all.
- Verified: `npm run playtest:loop` (new harness `tools/playtest/three-loop.mjs`)
  auto-drives to pickup→dropoff, confirms pickup+deliver fire, coins/combo/score
  move, ~21–27 draws, no console errors. Screenshots look great.

**Beautification (per user "sehir assetleri, trafik, yol çizgileri"):**
- `CityView.ts` rewritten: dashed yellow centre-lines, white zebra crossings at
  every intersection, warm low-poly buildings + rooftop structures, sidewalk trees,
  streetlights. All instanced (~1 draw each).
- `src/world/Traffic3D.ts` — pooled AI cars cruising road lanes (2 draws total for
  the fleet), recycle around the player; collision → crash + combo break, close
  fast pass → near-miss. Count ramps with difficulty.

**New controls (per user "direksiyon + gaz pedalı, oklarla telefonda çok zor"):**
- `src/ui/DriveControls.ts` replaces the ‹▲› arrow pad: a **draggable analog
  steering wheel** (bottom-left, relative horizontal drag → proportional steer,
  recentres on release) + a **hold gas pedal** (bottom-right, "GAZ"). Added
  `Vehicle3D.setSteerAxis` + `ControlSteerAxis` event. Keyboard still mirrors.
- **Next:** market/shop + meta screens (user said "market vs sonra"); real-device
  feel pass on the wheel (tune `World.maxTurnRate` / drag `range`); audio + juice.


**Playtested in browser:** ✅ automated headless-Chrome playtest (boot→menu→run→
deliver→combo→results, driving/turns/bounds, leak + flow sweep). Human feel-pass
on a real device still recommended.

## Session 2026-07-18 — P0 + driving overhaul
- **Verified in a real browser** via a puppeteer-core harness driving installed
  Chrome: menu/gameplay/results render; full loop works; ~60fps; no console
  errors. Turns commit at intersections; car never leaves the grid; no bus
  listener leaks across 4 restarts; pause/resume, order-expiry, Garage all OK.
- **New control model (per user):** the center ▲ is now a **Gas pedal** — hold to
  accelerate (curved), release to coast/brake down to `idleSpeedFactor` of top
  speed. Left/Right still steer. Grounded in arcade game-feel research (curved
  accel, snappier brake). Tunables in `Balance.Vehicle` (`idleSpeedFactor`,
  `accelDamp`, `brakeDamp`). Verified: idle≈0.32×top, gas→top (norm 1.0), release
  → curved decay back to idle.
- **Bugs fixed:** (1) order **expiry soft-lock** — `OrderSystem` emitted
  `OrderExpired` before nulling `current`, wiping the just-spawned next order;
  (2) **Garage** stacked panels/buttons every cycle (not parented to the card);
  (3) HUD order-title stuck green after first pickup; (4) results "best combo"
  showed final streak, not max (`RunState.maxStreak`); (5) favicon 404.
- **Touch input offset ("kayıklık") fixed:** `index.html` flex-centered `#game`
  WHILE Phaser `autoCenter` also centered → canvas pushed off-center (measured
  top 113 vs correct 75 on a 390×844 viewport), misaligning touches on device.
  Removed the flex centering (Phaser owns it now); added `game.scale.refresh()`
  on window/visualViewport resize + orientationchange so URL-bar changes don't
  stale the input bounds. Verified: canvas centers correctly, taps register ≤1px
  from target across 3 device viewports.
- **Tuning:** `inputBufferTime` 1.2→2.0s (was shorter than one block of travel, so
  steers were dropped); countdown snappier (`Run.countdownStepMs/GoMs`, ~1.46s).
- Dev handles: `window.game` + `window.bus` exposed in DEV for debugging.
- **Project tooling added (per user):** a permanent **playtest harness** at
  `tools/playtest/` (puppeteer-core devDep) with `npm run playtest`,
  `playtest:feel`, `playtest:touch`; a **`playtest` skill**
  (`.claude/skills/playtest/`); and three agents (`.claude/agents/`):
  `game-playtester`, `phaser-gameplay-engineer`, `game-feel-tuner`.
- **MAJOR PIVOT → Three.js 3D rewrite** (the 2D "stay" was reversed). The Phaser
  build felt unplayable on the user's phone; root cause = the whole city redrawn as
  vector Graphics every frame → FPS collapse (menu 64 → game 28→18 even on desktop
  software-GL) → slow-motion (30s "countdown", car "doesn't move", steer misses).
  - Filled the ENTIRE `book-of-game` (60 chapters) into `docs/game-design/` via
    Haiku sub-agents; `docs/game-design/00_CANONICAL_BRIEF.md` is the source of
    truth (Reconciliation section wins). `docs/game-design/README.md` indexes it.
  - **Three.js Phase 1 (skeleton) DONE & verified:** `three` installed;
    `src/engine/Game.ts` (renderer/loop/camera/resize/FPS, DPR cap ≤2);
    `src/boot.ts` renders the full 16×16 city as ONE InstancedMesh → **3 draw
    calls / 3086 tris** total (the perf fix), warm low-poly look, no errors.
    `index.html` repointed to `/src/boot.ts`; UI will be an **HTML/CSS overlay**
    (`#ui`) over the canvas — native DOM buttons fix the touch-offset problems.
    New check: `node tools/playtest/three-smoke.mjs`.
  - Old Phaser `src/` files remain dormant (not loaded) as reference; remove later.
  - **Phase 2 (logic port) DONE:** `EventBus` de-Phaser'd (tiny custom emitter,
    same API) so RunState/Balance/data/services/save are engine-agnostic. Verified
    in-browser: emitter + RunState economy (coins/combo/score) + Profile all work
    with zero errors. All other reusable modules already had no Phaser import.
  - **Phase 3+4 (drivable 3D city) DONE & verified:** `src/world/Grid.ts` (3D grid
    coord math, Balance units), `src/world/CityView.ts` (ground + plots + buildings
    as instanced meshes), `src/world/Vehicle3D.ts` (throttle + buffered steer +
    lane-keep + smooth turn ported to XZ, low-poly car mesh), `src/render/
    ChaseCamera.ts` (smoothed low-angle follow), `src/ui/ControlPadHtml.ts` (native
    HTML ‹ ▲ › pad + keyboard → bus). `boot.ts` composes them. Verified: car drives,
    120 km/h, turns all 4 dirs, ~12 draws, no errors. Check: `three-drive.mjs`.
    Looks great (low-poly city + chase cam + clean DOM controls; touch is native →
    no offset). Car is ~9 of the 12 draws (un-merged mesh) — merge later if needed.
  - Next phases: 5) orders (beacons + nav) / traffic / HUD (HTML/CSS overlay) +
    run timer/economy wired to the ported RunState; 6) assets, audio, juice, polish.
  - Feedback pending from user on feel/look ("we'll review details together").
- (Superseded) earlier plan: staying 2D on Phaser.
- **Driving + map feel overhaul (all 4 flagged areas):**
  1. *Turn feel* — removed the corner teleport in `Vehicle.commitTurn`; the car
     now changes heading in place and lane-keeping eases it into the new lane
     (smooth arc, no sideways lurch).
  2. *Speed feel* + 4. *Camera* — new `Balance.Camera`: look-ahead and zoom-out
     now scale with speed (sense of speed + more road visible); tighter follow.
  3. *Map/route readability* — bigger, color-coded nav arrow (orange→pickup,
     green→dropoff) with a **blocks-remaining label**; more prominent target
     beacon (bigger glyph + stronger ring pulse).
  Verified via `playtest`/`playtest:feel` (turns commit, 0 out-of-bounds, loop
  works, no errors) + screenshots. Traffic counts left as-is — now that you can
  brake to dodge it should be fairer; retune on real-device feel if needed.

This file is the handoff/plan. It is safe to `/clear` the chat: `CLAUDE.md` +
`docs/DESIGN_BIBLE.md` + this file carry all the context needed to continue.

---

## How to resume (do this first)
```bash
cd C:\Users\Pekka\Desktop\oyundikri
npm run dev          # open http://localhost:5173
```
Then **playtest the core loop** and tune. Keyboard works for desktop testing:
`←/A` left, `→/D` right, `↑/W` straight, `Esc/P` pause. On mobile/touch use the
three on-screen buttons.

Everything is installed (`node_modules` present: phaser 3.90, vite 6.4, ts 5.9).

---

## ✅ DONE — core game is code-complete and builds

**Foundation**
- Vite + TS + Phaser scaffold, portrait 720×1280 FIT, `package.json` scripts.
- Procedural texture factory (cars, pins, rings, arrow, coin, gem, particles,
  buildings) — no image assets needed.
- Synthesized audio (engine hum + all SFX hooks) via WebAudio; haptics hooks.
- Event bus, seeded RNG (mulberry32 + daily seed), object pool, math utils.
- Data-driven content: 4 vehicles, 10 cards, 5 city themes, 5 order kinds.
- Service interfaces + mock impls (leaderboard, cloud save, ads, analytics) via
  `ServiceLocator` — networking fully abstracted per the brief.
- Save/persistence (`SaveManager`, versioned + migrated) and `Profile` store
  (coins/gems/xp/level, vehicle levels, equipped cards, settings).

**Gameplay (the 60-second loop)**
- `CityGrid`: Manhattan grid (16×16), right-hand lane math, static scenery
  (ground, iso-ish buildings, roads, lane dashes, crosswalks), themed colors.
- `Vehicle`: auto-drive forward, buffered Left/Straight/Right committed at
  intersections, lane keeping, smooth rotation, crash slowdown + i-frames,
  edge auto-turn to stay in grid.
- `TrafficSystem`: pooled AI cars, right-hand lanes, collision + near-miss
  detection, density scales with difficulty, respawn around player.
- `OrderSystem`: pickup→dropoff near player, pulsing beacons + emoji glyphs,
  on-screen nav arrow, per-order timer, pickup/deliver/expire events.
- `RunState`: combo streak + multiplier (cap 8), coin/score formulas, VIP
  bonus, run clock that each delivery extends, difficulty ramp, run-end.

**UI / juice**
- Scenes: Boot → Preload (loader) → MainMenu → Game (+ HUD overlay) → Results,
  plus Garage.
- HUD: pause, run timer + bar, coins, score, order card (icon/kind/reward/timer/
  URGENT tag), combo popup, live speedometer, the 3-button ControlPad.
- MainMenu: brand, currency pills, city-of-the-day, high score/level, PLAY,
  GARAGE (works), and Cards/Shop/Leaderboard (toast stubs), decorative car.
- Results: score/deliveries/combo/coins, new-record badge, confetti, 2×-coins
  rewarded-ad (mock), Retry, Menu.
- Garage: vehicle carousel, stat bars, upgrade/unlock/select wired to `Profile`.
- Effects: particle burst, confetti, floating reward text, screen shake, flash.

**Docs**
- `docs/DESIGN_BIBLE.md` (745 lines) — full spec distilled from `book-of-game`.
- `CLAUDE.md` — architecture + conventions for future sessions.

---

## 🔜 REMAINING — prioritized plan

### P0 — Verify & feel  (mostly DONE — see 2026-07-18 session log above)
1. ✅ Automated browser playtest done; loop + turns + bounds verified, bugs fixed.
   ⏳ **Still want a human feel-pass on a real touch device** for: throttle feel
   (idle/accel/brake values), turn snap at corners, and **traffic fairness now
   that you can brake to dodge** (may want to re-tune spawn distance/counts).
2. ⏳ **Ongoing feel tuning** in `Balance.ts` — throttle (`idleSpeedFactor`,
   `accelDamp`, `brakeDamp`), `inputBufferTime`, traffic counts, order limits.
3. Fix anything else that surfaces from real-device play.

### P1 — Missing gameplay from the brief
- Card effects only partly applied in-run: wired = highwaySpeed, coinBonus,
  trafficReduction, freeFirstCrash. **Not yet applied:** policeIgnore, vipOrders
  (chance boost), droneDelivery, slowMotion, magnetCoins, fuelBoost. Resolve
  them in `GameScene.resolveCards()` + the relevant systems.
- Hazards named in the brief but not built: police (chase), pedestrians,
  accidents, road work, weather, nitro/fuel/durability as real mechanics.
- Endless city streaming (currently a fixed 16×16 grid with edge auto-turn).
  Bible describes 3×3 chunk streaming with pooling if you want true endless.
- Object-pool particles/floating text (currently create+destroy per event).

### P2 — Meta screens (mockup shows 14; only Menu/Garage/Results exist)
Still stubs (toasts): **Cards** (equip 3, collection, rarity), **Shop / Card
Market** (coins/gems packs, daily shop), **Missions** (daily/weekly), **Leaderboard**
(global/country/friends/weekly — data already available from `MockLeaderboard`),
**Season / Battle Pass**, **Profile**, **Car Customization** (skins/paint),
**Events / special mode**. Build these as new scenes using `UiKit`. All backing
data/services already exist.

### P3 — Polish
- Background music loop; richer engine audio; more SFX variety.
- Real art pass (optional) — swap procedural textures for sprite atlases; the
  bible targets <80 draw calls / per-theme atlases.
- Accessibility toggles (colorblind palette, reduced motion) — settings exist in
  `Profile.settings` but aren't consumed yet.
- Localization (UI strings are Turkish inline today).

---

## ⚠️ Known risks / things to verify in browser
- **Turn feel:** `Vehicle.commitTurn` snaps to the node on a turn — confirm it
  looks smooth, not teleporty. Adjust `turnCommitDist`/lane `laneLambda`.
- **Traffic fairness:** cars drive straight only and cross at intersections;
  make sure the auto-driver isn't hit unavoidably. Tune spawn distance/counts.
- **Camera at edges:** `setBounds` to world; near grid edges the follow may
  clamp. Order spawns are biased interior to reduce this.
- **Emoji glyphs** (order kinds, buttons ▲ ‹ ›, menu icons) render fine on the
  target device/browser.

## File map quick reference
See `CLAUDE.md` → "Source architecture". Orchestrator: `src/scenes/GameScene.ts`.
All tuning: `src/core/Balance.ts`. All colors: `src/core/Palette.ts`.
