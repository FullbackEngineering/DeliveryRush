import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Game } from '@/engine/Game';
import { Grid } from '@/world/Grid';
import { CityView } from '@/world/CityView';
import { CityDecor } from '@/world/CityDecor';
import { Vehicle3D } from '@/world/Vehicle3D';
import { loadGLB, prepareVehicle } from '@/world/ModelLoader';
import carUrl from '@/assets/models/car_murphy.glb?url';
import copUrl from '@/assets/models/car_cop.glb?url';
import { Orders3D } from '@/world/Orders3D';
import { Traffic3D } from '@/world/Traffic3D';
import { Police } from '@/world/Police';
import { PoiSystem } from '@/world/Pois';
import { NavArrow } from '@/world/NavArrow';
import { ChaseCamera } from '@/render/ChaseCamera';
import { DriveControls } from '@/ui/DriveControls';
import { Hud } from '@/ui/Hud';
import { FreeHud } from '@/ui/FreeHud';
import { ModeSelect } from '@/ui/ModeSelect';
import { GarageScreen } from '@/ui/GarageScreen';
import { MarketScreen } from '@/ui/MarketScreen';
import { CarPreview } from '@/world/CarPreview';
import { RunController } from '@/systems/RunController';
import { JobBoard } from '@/systems/JobBoard';
import { Rng, dailySeed } from '@/utils/Rng';
import { bus, GameEvent } from '@/core/EventBus';
import { Steer } from '@/types';
import { Profile } from '@/managers/ProfileStore';
import { VEHICLE_MAP, VEHICLES, driveStatsAtLevel } from '@/data/vehicles';
import { RUSH_CITY, FREE_CITY, Nav, Garage as GarageBalance } from '@/core/Balance';
import { Palette } from '@/core/Palette';

/**
 * Delivery Rush — Three.js core with a mode picker. RUSH is the 60-second delivery
 * sprint (tuned city, run economy, results). SERBEST is a much larger open city
 * with wide avenues you free-drive around (orders/economy land in the next pass).
 * GARAJ is the car gallery/showroom (browse, select, upgrade, unlock).
 * `?mode=rush` / `?mode=free` / `?mode=garage` boot straight in; no param shows
 * the picker.
 */

const container = document.getElementById('app')!;
const ui = document.getElementById('ui')!;

const game = new Game(container);
game.camera.far = 2500;
game.camera.updateProjectionMatrix();
const { scene } = game;

// Lights (shared across modes).
scene.background = new THREE.Color(0x9fd3ea);
scene.add(new THREE.HemisphereLight(0xffffff, 0x55606f, 1.0));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
sun.position.set(200, 400, 130);
scene.add(sun);

// Neutral image-based lighting so the PBR car metals/glass read correctly
// (metallic surfaces render near-black without an environment to reflect).
const pmrem = new THREE.PMREMGenerator(game.renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// The real low-poly car GLB; prepared once, cloned per vehicle. Falls back to the
// procedural box car if loading fails (harness/offline).
let carTemplate: THREE.Group | null = null;
// The police-liveried GLB (SERBEST patrol cars); prepared once, cloned per cop.
let copTemplate: THREE.Group | null = null;

const rng = new Rng(dailySeed());
const profile = Profile.get();
const def = VEHICLE_MAP[profile.selectedVehicle] ?? VEHICLE_MAP['starter'];
// Per-vehicle 3D handling (top speed / acceleration limit / turn) at the car's
// current upgrade level — makes the roster feel distinct and upgrades matter.
const drive = driveStatsAtLevel(def, Profile.vehicleLevel(def.id));

const fpsEl = document.getElementById('fps');
const goMenu = () => { window.location.href = window.location.pathname; };

/** Wire the shared dev/fps readout to a live vehicle. */
function wireFps(vehicle: Vehicle3D): void {
  let acc = 0;
  game.onUpdate((dt) => {
    acc += dt;
    if (acc >= 0.25 && fpsEl) {
      acc = 0;
      fpsEl.textContent = `${game.fps} fps · ${game.renderer.info.render.calls} draws · ${vehicle.speedKmh} km/h`;
    }
  });
}

// --- RUSH: the tuned 60-second delivery sprint -----------------------------
function startRush(): void {
  scene.fog = new THREE.Fog(0x9fd3ea, 140, 820);
  const grid = new Grid(RUSH_CITY);
  const city = new CityView(grid, rng);
  scene.add(city.group);

  const start = grid.nodePos(Math.floor(grid.cols / 2), Math.floor(grid.rows / 2));
  const vehicle = new Vehicle3D(grid, def.bodyColor, def.accentColor, start.x, start.z, 0, carTemplate, drive);
  scene.add(vehicle.object);

  const orders = new Orders3D(grid, rng);
  scene.add(orders.group);
  const traffic = new Traffic3D(grid, rng);
  scene.add(traffic.group);
  const chase = new ChaseCamera(game.camera);

  new DriveControls(ui);
  const run = new RunController(orders, vehicle, start.x, start.z);
  bus.on(GameEvent.ControlSteer, (s: Steer) => run.running && vehicle.setSteer(s));
  bus.on(GameEvent.ControlSteerAxis, (a: number) => vehicle.setSteerAxis(run.running ? a : 0));
  bus.on(GameEvent.ControlThrottle, (on: boolean) => vehicle.setThrottle(run.running && on));
  bus.on(GameEvent.ControlReverse, (on: boolean) => vehicle.setReverse(run.running && on));

  new Hud(ui, () => run.start(), goMenu);

  const carPos = new THREE.Vector3();
  game.onUpdate((dt) => {
    run.update(dt);
    vehicle.update(dt);
    traffic.setDifficulty(run.state.difficulty);
    traffic.update(dt, vehicle, run.running);
    carPos.set(vehicle.x, 1, vehicle.z);
    chase.update(dt, carPos, vehicle.yaw, vehicle.normalizedSpeed);
  });
  wireFps(vehicle);

  game.start();
  run.start();
  exposeHarness(game, vehicle, orders, traffic, grid, run);
}

// --- SERBEST: the large open city (free roam) ------------------------------
function startFree(): void {
  scene.fog = new THREE.Fog(0x9fd3ea, 220, 1600);
  const grid = new Grid(FREE_CITY);

  // Place POIs first so CityView can reserve their plots (no overlap with a
  // random building). CityDecor then claims a few more interior plots for its GLB
  // landmarks/kit buildings; the combined reserved set keeps CityView from putting
  // a procedural box on any of them.
  const pois = new PoiSystem();
  pois.place(grid, rng);
  const decor = new CityDecor(grid, rng);
  const reserved = decor.planPlots(pois.reserved);
  const city = new CityView(grid, rng, reserved);
  scene.add(city.group);
  scene.add(pois.group);
  // Real-GLB dressing (NY skyline ring + school landmarks + colourful kit
  // buildings), streamed in async so it never blocks the first frame.
  void decor.build();
  scene.add(decor.group);

  const start = grid.nodePos(Math.floor(grid.cols / 2), Math.floor(grid.rows / 2));
  const vehicle = new Vehicle3D(grid, def.bodyColor, def.accentColor, start.x, start.z, 0, carTemplate, drive);
  scene.add(vehicle.object);

  const traffic = new Traffic3D(grid, rng);
  scene.add(traffic.group);
  // Patrol police: speeding past one (or crashing beside one) → fine + short chase.
  const police = new Police(grid, rng, copTemplate);
  scene.add(police.group);
  const chase = new ChaseCamera(game.camera);

  new DriveControls(ui);
  // Free roam: driving is always live (no run gate).
  bus.on(GameEvent.ControlSteer, (s: Steer) => vehicle.setSteer(s));
  bus.on(GameEvent.ControlSteerAxis, (a: number) => vehicle.setSteerAxis(a));
  bus.on(GameEvent.ControlThrottle, (on: boolean) => vehicle.setThrottle(on));
  bus.on(GameEvent.ControlReverse, (on: boolean) => vehicle.setReverse(on));

  // Open-world job board: source→dest deliveries between the POIs, persistent
  // wallet economy (Profile.coins), nav arrow + bright beacon at the active target.
  const board = new JobBoard(pois, rng);
  const arrow = new NavArrow();
  scene.add(arrow.group);
  const freeHud = new FreeHud(ui, board, grid, pois.list, goMenu);
  board.refresh();

  const carPos = new THREE.Vector3();
  game.onUpdate((dt) => {
    vehicle.update(dt);
    traffic.setDifficulty(0.5);
    traffic.update(dt, vehicle, true);
    police.update(dt, vehicle, true);
    carPos.set(vehicle.x, 1, vehicle.z);
    chase.update(dt, carPos, vehicle.yaw, vehicle.normalizedSpeed);
    freeHud.setSpeed(vehicle.speedKmh);
    freeHud.updateMap(dt, vehicle.x, vehicle.z, vehicle.yaw);

    pois.update(dt);
    board.tick(dt, vehicle.x, vehicle.z, vehicle.speedKmh);
    const job = board.active;
    const targetPoi = job ? (job.state === 'toPickup' ? job.source : job.dest) : null;
    if (targetPoi) {
      const color = job!.state === 'toPickup' ? Palette.orange : Palette.green;
      arrow.setColor(color);
      pois.highlightTarget(targetPoi, color);
      const dist = Math.hypot(targetPoi.x - vehicle.x, targetPoi.z - vehicle.z);
      if (dist > Nav.arrowHideM) arrow.point(vehicle.x, vehicle.z, vehicle.yaw, targetPoi.x, targetPoi.z, dt);
      else arrow.hide();
    } else {
      arrow.hide();
      pois.highlightTarget(null, 0);
    }
  });
  wireFps(vehicle);

  game.start();
  exposeHarness(game, vehicle, null, traffic, grid, null, { board, pois, police, decor });
}

// --- GARAJ: the car gallery / showroom (browse, select, upgrade, unlock) ---
function startGarage(): void {
  scene.background = new THREE.Color(GarageBalance.bg);
  // Garage-only FOV override (wider than the shared 52° driving camera) — see the
  // comment on `Garage.fov` for why: keeps the whole car in frame at every
  // turntable angle. Reset for free on the next page load (every mode boots fresh).
  game.camera.fov = GarageBalance.fov;
  game.camera.position.set(GarageBalance.camPos.x, GarageBalance.camPos.y, GarageBalance.camPos.z);
  game.camera.lookAt(GarageBalance.camLook.x, GarageBalance.camLook.y, GarageBalance.camLook.z);
  game.camera.updateProjectionMatrix();

  const preview = new CarPreview(scene);
  const startDef = VEHICLE_MAP[Profile.get().selectedVehicle] ?? VEHICLES[0];
  void preview.setCar(startDef);

  const screen = new GarageScreen(ui, preview, goMenu);
  game.onUpdate((dt) => preview.update(dt));
  game.start();

  // Harness hook (stable shape — mirrors exposeHarness for rush/free).
  (window as unknown as Record<string, unknown>).__three = {
    garage: true,
    get fps() { return game.fps; },
    get draws() { return game.renderer.info.render.calls; },
    get coins() { return Profile.get().coins; },
    get selected() { return Profile.get().selectedVehicle; },
    get viewId() { return screen.currentId; },
    next: () => screen.next(),
    prev: () => screen.prev(),
    profile: Profile,
    preview,
    screen,
    game,
    bus,
  };
}

// --- MARKET: cards / boosts / cosmetics shop (native DOM overlay) -----------
function startMarket(): void {
  game.start(); // render the sky behind the market overlay
  const market = new MarketScreen({ mount: ui, onClose: goMenu });
  market.open();
  // Harness hook (stable shape — mirrors the other modes).
  (window as unknown as Record<string, unknown>).__three = {
    market: true,
    get coins() { return Profile.get().coins; },
    get gems() { return Profile.get().gems; },
    screen: market,
    game,
    bus,
    profile: Profile,
  };
}

/** Expose game internals for the headless playtest harness (shape stable across modes). */
function exposeHarness(
  g: Game, vehicle: Vehicle3D, orders: Orders3D | null, traffic: Traffic3D,
  grid: Grid, run: RunController | null,
  free?: { board: JobBoard; pois: PoiSystem; police: Police; decor: CityDecor },
): void {
  (window as unknown as Record<string, unknown>).__three = {
    get fps() { return g.fps; },
    get draws() { return g.renderer.info.render.calls; },
    get kmh() { return vehicle.speedKmh; },
    get yaw() { return +vehicle.yaw.toFixed(2); },
    get pos() { return { x: Math.round(vehicle.x), z: Math.round(vehicle.z) }; },
    get order() {
      const o = orders?.current;
      return o ? { id: o.id, kind: o.kind, pickedUp: o.pickedUp, vip: o.vip,
        target: o.pickedUp ? o.dropoff : o.pickup } : null;
    },
    get nodePos() { return (c: number, r: number) => grid.nodePos(c, r); },
    get coins() { return Profile.get().coins; },
    get state() {
      if (!run) return { running: false, free: true };
      return { time: +run.state.time.toFixed(1), streak: run.state.streak,
        deliveries: run.state.deliveries, coins: run.state.coinsThisRun, score: run.state.score,
        running: run.running };
    },
    get job() {
      const j = free?.board.active;
      if (!j) return null;
      return {
        id: j.id, state: j.state, pay: j.pay, special: j.special, timeLimit: j.timeLimit,
        source: { id: j.source.id, name: j.source.name, x: j.source.x, z: j.source.z, col: j.source.col, row: j.source.row },
        dest: { id: j.dest.id, name: j.dest.name, x: j.dest.x, z: j.dest.z, col: j.dest.col, row: j.dest.row },
      };
    },
    get offered() {
      return free?.board.offered.map((j) => ({
        id: j.id, pay: j.pay, distanceM: Math.round(j.distanceM), timeLimit: j.timeLimit, special: j.special,
      })) ?? [];
    },
    get pois() {
      return free?.pois.list.map((p) => ({
        id: p.id, type: p.type, name: p.name, isSource: p.isSource, x: p.x, z: p.z, col: p.col, row: p.row,
      })) ?? [];
    },
    board: free?.board ?? null,
    poiSystem: free?.pois ?? null,
    police: free?.police ?? null,
    get chasing() { return free?.police?.isChasing ?? false; },
    get decorPlots() { return free?.decor?.plotCenters() ?? null; },
    vehicle, orders, traffic, run, game: g, grid, bus,
  };
}

// --- Route by ?mode= --------------------------------------------------------
const mode = new URLSearchParams(window.location.search).get('mode');

/** Preload + prepare the shared car template before spawning a drivable world. */
async function preloadCar(): Promise<void> {
  try {
    const src = await loadGLB(carUrl);
    carTemplate = prepareVehicle(src, {
      targetLength: 5.8,          // reads bigger relative to the wide roads (was 4.6, felt small)
      extraYaw: Math.PI,          // model faces -Z; flip so the nose is +Z (travel dir)
      bodyColor: def.bodyColor,   // paint the car in the player's palette colour
      contactShadow: true,        // ground it in the matte world
      dropMeshes: /numberplate_front/i, // broken mesh (spans 0–2.15m) → made the car float
    });
  } catch (e) {
    console.warn('[boot] car model load failed — using procedural box car', e);
  }
}

/** Preload + prepare the police-liveried cop template (SERBEST patrol cars).
 *  Keeps the original livery (no body tint); falls back to a procedural white car. */
async function preloadCop(): Promise<void> {
  try {
    const src = await loadGLB(copUrl);
    copTemplate = prepareVehicle(src, {
      targetLength: 5.8,
      extraYaw: Math.PI,
      contactShadow: true,
      dropMeshes: /numberplate_front/i,
    });
  } catch (e) {
    console.warn('[boot] cop model load failed — using procedural box cop', e);
  }
}

(async () => {
  if (mode === 'rush' || mode === 'free') {
    await preloadCar();
    if (mode === 'free') await preloadCop(); // patrol police only exist in SERBEST
    document.getElementById('loading')?.remove();
    if (mode === 'rush') startRush();
    else startFree();
  } else if (mode === 'garage') {
    // The garage builds/tints its own preview model via CarPreview — it doesn't
    // need the shared `carTemplate` (rush/free's cloned-per-vehicle template).
    document.getElementById('loading')?.remove();
    startGarage();
  } else if (mode === 'market') {
    // The market is a native-DOM overlay over the sky — no world/car needed.
    document.getElementById('loading')?.remove();
    startMarket();
  } else {
    document.getElementById('loading')?.remove();
    game.start(); // render the sky behind the picker
    new ModeSelect(ui, (pick) => {
      window.location.search = `?mode=${pick}`;
    });
  }
})();
