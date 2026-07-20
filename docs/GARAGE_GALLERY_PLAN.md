# Garage / Car Gallery — Implementation Plan (Opus design → Sonnet build)

**Status:** design/hand-off doc. 2026-07-19.
**Goal:** a **car gallery/garage** screen where the player browses the vehicle
roster on a rotating 3D turntable, compares each car's now-distinct handling
(top speed / acceleration / turn), and **selects / upgrades / unlocks** cars.
Reachable from the boot mode picker. Whatever car is selected here is the car you
then drive in RUSH and SERBEST (boot already reads `Profile.selectedVehicle`).

Read `CLAUDE.md` first and obey the conventions: **tune in `core/Balance.ts`**,
**communicate via the `bus`**, **`Profile` is the ONLY place saved data mutates**
(read via getters), always `bus.off(...)` your handlers on teardown. The UI is a
**native HTML/CSS overlay** in `#ui` (like `ui/ModeSelect.ts`, `ui/FreeHud.ts`) —
NOT canvas-drawn — because native DOM = perfect touch on phones. Portrait,
mobile-first, **compact + cute + responsive** (`clamp()`/`vw`/`vmin`, never fixed
huge px). The user cares intensely about feel/visuals and plays on a real phone.

---

## 0. Grounding facts (verified in-repo)

- **Boot routing** (`src/boot.ts`): `?mode=rush` → `startRush()`, `?mode=free` →
  `startFree()`, no param → `new ModeSelect(...)`. Picking reloads via
  `window.location.search = '?mode=...'`. `goMenu()` = `window.location.href =
  window.location.pathname` (back to picker). The Three.js `game` (engine),
  `scene`, lights + **PMREM environment** are created at module top-level BEFORE
  routing, so every mode already has lighting/env. `scene.background` is sky blue.
- **Vehicle data** (`src/data/vehicles.ts`): `VEHICLES` (starter → sport → super →
  hyper), `VEHICLE_MAP`, `upgradeCost(def, level)`, and NEW `driveStatsAtLevel(def,
  level) → { topSpeed, accel, turn }` (meters; this is the roster-differentiating
  handling — see `VehicleDef.drive` in `src/types`). `statsAtLevel` = legacy px stats.
- **Profile** (`src/managers/ProfileStore.ts`, singleton `Profile`): getters via
  `Profile.get()` → `{ coins, selectedVehicle, ownedVehicles, vehicleLevels, ... }`.
  Mutators (all persist + emit): `selectVehicle(id)`, `upgradeVehicle(id):bool`
  (spends coins, +1 level), `unlockVehicle(id):bool` (spends `def.unlockCost`),
  `canUpgradeVehicle(id):bool`, `vehicleLevel(id):number`, `addCoins(n)` (emits
  `CoinsChanged`). Starter is owned by default; `unlockCost < 0` = premium/locked
  (NOT coin-buyable). Emits `GameEvent.CoinsChanged` and `ProfileChanged`.
- **Model** (`src/world/ModelLoader.ts`): `loadGLB(url)` (cached) +
  `prepareVehicle(src, opts)` → a ready `THREE.Group` (scaled/oriented/grounded,
  matte-stylised, body tinted by `opts.bodyColor` where the material name matches
  `/body/i`, optional `contactShadow`, `dropMeshes`). Car GLB:
  `@/assets/models/car_murphy.glb?url`. **There is only ONE car model** — each
  roster car is the same shape in its `def.bodyColor` (fine for v1). `bike.glb`
  exists (optional stretch: use for the "City Scooter" starter). In-game the car is
  prepared with `targetLength: 5.8, extraYaw: Math.PI, dropMeshes:/numberplate_front/i`.
- **Style language to match**: dark glass cards (`rgba(13,19,31,0.72)`), rounded
  14–22px, `#e6edf7` text, gold `#ffd54a` coins, green `#37d67a` accent, safe-area
  insets. Copy tone from `ModeSelect`/`FreeHud`. Turkish UI strings.

---

## 1. Route + entry point

- **Boot**: add `?mode=garage` → `startGarage()` in `src/boot.ts` (mirror the
  `startRush/startFree` structure). In the router at the bottom, treat `garage`
  like the other modes: `await preloadCar()` is NOT required (the garage loads the
  model itself), but reusing the same `loadGLB` cache is fine. Remove `#loading`,
  then `startGarage()`.
- **ModeSelect** (`src/ui/ModeSelect.ts`): add a **third card** "🚗 GARAJ" (desc:
  "Araç galerisi — araçları incele, yükselt, seç.") that navigates to
  `?mode=garage`. Widen the `onPick` union to `'rush' | 'free' | 'garage'`. Keep
  the same card style (give it its own accent, e.g. gold `#ffd54a` left border).
- The garage's **back** button + a **"BU ARAÇLA OYNA"** shortcut both use
  `goMenu()` (back to the picker), where the player then chooses RUSH/SERBEST with
  the car they just selected. (Optional nicety: back returns to picker; that's enough.)

## 2. 3D turntable preview — `src/world/CarPreview.ts` (new)

A class that owns the showroom centrepiece: the selected car slowly rotating on a
platform, reusing the shared `game`/`scene` (lights + env already present).

```ts
export class CarPreview {
  readonly group = new THREE.Group();          // platform + car holder
  constructor(scene: THREE.Scene) { scene.add(this.group); /* + a platform disc */ }
  async setCar(def: VehicleDef): Promise<void>  // (re)build the model in def.bodyColor
  update(dt: number): void                      // spin the car holder about Y
  dispose(): void
}
```

- **Platform**: a low cylinder / rounded disc (radius ~5 m, height ~0.4) in a
  neutral studio tone + a soft ring, so the car sits on something. One or two meshes.
- **Car**: `loadGLB(carUrl)` then `prepareVehicle(src, { targetLength: 5.8,
  extraYaw: Math.PI, bodyColor: def.bodyColor, contactShadow: true,
  dropMeshes: /numberplate_front/i })`. Put it in a `holder` child; on `setCar`,
  dispose the previous car (traverse → geometry/material `.dispose()`) and add the
  new one. Guard against races (ignore a resolved load if `setCar` was called again).
- **Rotate**: `holder.rotation.y += dt * ~0.5` in `update`.
- **Camera**: `startGarage` sets `game.camera` to a fixed 3/4 hero framing, e.g.
  `position (5.5, 3.6, 8.5)`, `lookAt(0, 1.3, 0)` — tune with a screenshot so the
  whole car is framed, lower-third-ish, not clipped. Do NOT use `ChaseCamera`.
- **Background**: optionally darken `scene.background` to a studio tone for the
  garage (e.g. `0x121a26`) and restore isn't needed (garage is its own page load).
- Keep it cheap: platform + one car model ≈ the in-game car's draw count (~10–20).

## 3. UI overlay — `src/ui/GarageScreen.ts` (new)

Native DOM overlay in `#ui`. Owns the roster browsing + all Profile actions; tells
`CarPreview` which car to show. Pure Profile reader/mutator + bus listener.

**Constructor**: `new GarageScreen(parent, preview, onBack)`. Internal state:
`viewIndex` (which roster car is previewed, 0..VEHICLES.length-1), starting at the
index of `Profile.selectedVehicle`.

**Layout (portrait, responsive, compact):**
- **Top bar**: back button (`←`/`☰`) left; **wallet** pill `🪙 <coins>` right
  (listen `CoinsChanged`). Compact, safe-area top inset.
- **Preview stage**: the 3D canvas shows behind (`#ui` is transparent/pointer-none
  except children). Over it, centered: **prev `‹` / next `›`** big tap targets on
  the left/right edges to change `viewIndex`, and a **name plate** (car `def.name`
  + `Lv X/6` + a lock 🔒 badge if not owned). Optional dots indicator.
- **Stat panel** (below preview): three labeled bars — **Hız** (top speed),
  **İvme** (acceleration), **Manevra** (turn) — computed from
  `driveStatsAtLevel(def, level)`, each normalized to a 0..1 bar via fixed ranges
  (define locally): `topSpeed ∈ [15, 42]`, `accel ∈ [4, 20]`, `turn ∈ [2.2, 3.0]`.
  Show the top-speed number as km/h (`Math.round(topSpeed * 3.6)`). For an owned
  car use its current level; for a locked car show base (Lv 1) stats. Bars use a
  gradient fill; keep the row compact.
- **Action row** (bottom, above nothing — leave room, no drive controls here):
  - Not owned & `unlockCost >= 0`: **"AÇ · 🪙<cost>"** → `Profile.unlockVehicle(id)`;
    disable + dim when `coins < cost`.
  - Not owned & `unlockCost < 0`: **"🔒 PREMIUM"** disabled.
  - Owned & not selected: **"SEÇ"** → `Profile.selectVehicle(id)`.
  - Owned & selected: **"✓ SEÇİLİ"** disabled/active state.
  - Secondary **"YÜKSELT · 🪙<upgradeCost>"** whenever owned & `level < maxLevel`
    → `Profile.upgradeVehicle(id)`; disable when `!canUpgradeVehicle(id)`. Hide/replace
    with "MAKS SEVİYE" at max level.
  - (Optional) a **"BU ARAÇLA OYNA ▶"** button that calls `onBack()` after ensuring
    the previewed car is selected (only if owned).

**Behaviour:**
- Changing `viewIndex` → `preview.setCar(def)` + re-render name/stats/buttons.
- On `CoinsChanged` / `ProfileChanged` → re-render wallet + buttons + stats (an
  upgrade changes level → stat bars grow: nice feedback). After an upgrade, the
  preview car doesn't need a rebuild (same colour) but DO refresh the bars.
- After `selectVehicle`, re-render so the button shows "✓ SEÇİLİ".
- Store handlers and `bus.off(...)` them in `destroy()`.

## 4. Wire in `boot.ts::startGarage()`

```
function startGarage(): void {
  scene.background = new THREE.Color(0x121a26);      // studio tone (optional)
  game.camera.position.set(5.5, 3.6, 8.5);
  game.camera.lookAt(0, 1.3, 0);
  const preview = new CarPreview(scene);
  const startDef = VEHICLE_MAP[Profile.get().selectedVehicle] ?? VEHICLES[0];
  void preview.setCar(startDef);
  const screen = new GarageScreen(ui, preview, goMenu);
  game.onUpdate((dt) => preview.update(dt));
  game.start();
  // Harness hook (stable shape):
  (window as any).__three = {
    garage: true,
    get coins() { return Profile.get().coins; },
    get selected() { return Profile.get().selectedVehicle; },
    get viewId() { return screen.currentId; },        // expose the previewed id
    next: () => screen.next(), prev: () => screen.prev(),
    profile: Profile, preview, screen, game, bus,
  };
}
```
Expose `screen.currentId`, `screen.next()`, `screen.prev()` (public) for the harness.

## 5. Files

**New:** `src/world/CarPreview.ts`, `src/ui/GarageScreen.ts`,
`tools/playtest/garage.mjs`.
**Edited:** `src/boot.ts` (`startGarage` + route), `src/ui/ModeSelect.ts` (Garaj
card + union type). No `Balance` change strictly required, but if you add any tunable
(rotation speed, camera framing, stat-bar ranges) put it in `core/Balance.ts` as a
`Garage` block rather than magic numbers in the systems.

## 6. Acceptance (must verify in a real browser via `tools/playtest`)

- `npm run typecheck` + `npm run build` green.
- Boot `?mode=garage`: a rotating car renders on a platform, no console errors,
  draws stay < ~25. Screenshot looks good (car framed, stats + buttons visible,
  nothing clipped on 390×844; controls-free layout is compact + cute).
- `next()/prev()` cycles all 4 cars; the **preview colour changes** and the **stat
  bars + km/h + buttons update** to match each car.
- **Select**: on an owned car, clicking SEÇ sets `Profile.selectedVehicle`
  (assert via `window.__three.selected`), and the button flips to "✓ SEÇİLİ".
- **Upgrade**: grant coins in the harness (`window.__three.profile.addCoins(99999)`),
  click YÜKSELT → level increases, coins drop by `upgradeCost`, stat bars grow.
- **Unlock**: with enough coins, AÇ on a locked non-premium car adds it to
  `ownedVehicles` and spends the cost; hyper shows 🔒 PREMIUM (not buyable).
- `garage.mjs` automates: boot, cycle cars (assert name/colour/stat DOM changes),
  addCoins, click upgrade + unlock + select, assert Profile reflects each. Prints
  PASS/FAIL and screenshots the screen.
- Dev-server note for the harness: bind Vite to `--host 127.0.0.1 --port <free>`
  and point `DR_URL` at `http://127.0.0.1:<port>/` — headless Chrome cannot resolve
  `localhost` reliably here; use `127.0.0.1`. A dev server may already be running.

## 7. Conventions checklist
- Native DOM overlay, responsive `clamp()`/`vw`, compact + cute, safe-area insets.
- `Profile` is the only save mutation; read via getters; UI reacts to `CoinsChanged`/
  `ProfileChanged`. `bus.off(...)` on `destroy()`.
- One car model (tint per car). Dispose the old preview model on switch (no leaks).
- Keep draw calls low. Verify FPS/draws + a screenshot. **Don't mark done without a
  browser playtest** (the user is feel-first and plays on a phone).
