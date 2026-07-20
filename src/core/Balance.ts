/**
 * Single source of truth for gameplay tuning. Keeping every "magic number" here
 * makes the game data-driven and easy to balance without touching logic.
 */

export const Design = {
  width: 720,
  height: 1280,
} as const;

export const City = {
  /** Distance between adjacent intersections (world px). */
  block: 360,
  /** Drivable road width. */
  roadWidth: 132,
  /** Half-lane offset from centerline (right-hand driving). */
  laneOffset: 30,
  /** Grid size (intersections). Large enough for 30–90s sessions. */
  cols: 16,
  rows: 16,
} as const;

export const Vehicle = {
  /** Distance from an intersection center at which a buffered turn commits. */
  turnCommitDist: 26,
  /**
   * Seconds an input stays buffered waiting for the next intersection. Must
   * exceed one block of travel time so a steer set just after an intersection
   * still survives to the next: the starter car (240px/s over 360px blocks)
   * needs 1.5s, so 2.0s gives comfortable margin. The buffer is always consumed
   * at the next intersection, so a longer window only helps.
   */
  inputBufferTime: 2.0,
  /** Speed→displayed km/h factor. */
  kmhFactor: 0.5,
  /** Crash slowdown factor and recovery. */
  crashSlowdown: 0.35,
  crashRecover: 1.6, // per second lerp back to 1

  // --- Throttle model (hold ▲ = accelerate, release = coast/brake) ----------
  /**
   * Off-throttle cruise as a fraction of max speed. The car slows to this when
   * the gas is released (never fully stops, so the courier run keeps flowing).
   */
  idleSpeedFactor: 0.32,
  /**
   * Curved (exponential) speed approach: each frame speed damps toward the
   * throttle target at `lambda = stat / damp`. Lower damp = snappier. Braking
   * is intentionally snappier than acceleration (arcade feel — lets you brake to
   * dodge traffic and slow for corners). See earok.net "Simplified acceleration".
   */
  accelDamp: 100, // accel lambda = stats.acceleration / accelDamp  (starter ≈ 5.2)
  brakeDamp: 62, // decel lambda = stats.braking / brakeDamp        (starter ≈ 10.3)
} as const;

export const Run = {
  /** Starting run clock (seconds). */
  startTime: 45,
  /** Time granted per successful delivery. */
  timePerDelivery: 7,
  /** Max clock (prevents infinite banking). */
  maxTime: 60,
  /** Countdown before "GO". */
  introCountdown: 3,
  /** Countdown pacing — kept snappy so the run starts fast. */
  countdownStepMs: 400,
  countdownGoMs: 260,
} as const;

export const Scoring = {
  /** Base coins per delivery before multiplier. */
  baseReward: 100,
  vipMultiplier: 2.2,
  /** Combo multiplier = min(comboCap, 1 + (combo-1) * comboStep) rounded for display. */
  comboStart: 1,
  comboCap: 8,
  /** Distance bonus: coins per 100px of optimal route length. */
  distanceBonus: 6,
  /** Perfect (no-crash) streak bonus coins. */
  cleanStreakBonus: 25,
  /** Score (leaderboard) = coins earned this run * scoreFactor + deliveries*perDelivery. */
  scoreFactor: 1,
  scorePerDelivery: 120,
} as const;

export const Traffic = {
  /** Target simultaneous AI cars scaling with difficulty. */
  baseCars: 10,
  maxCars: 26,
  minSpeed: 120,
  maxSpeed: 220,
  /** Car pool size (object pooling). */
  poolSize: 40,
} as const;

export const Difficulty = {
  /** Difficulty 0..1 reached at this many deliveries. */
  rampDeliveries: 12,
  /** Order time limit shrinks from start→min across the ramp. */
  orderTimeStart: 22,
  orderTimeMin: 12,
  /** VIP order chance grows with difficulty. */
  vipChanceStart: 0.08,
  vipChanceMax: 0.3,
} as const;

export const Camera = {
  /** Follow smoothing (Phaser lerp per frame; higher = tighter). */
  followLerp: 0.14,
  /** Look-ahead offset in px = leadBase + leadSpeed * normalizedSpeed. */
  leadBase: 80,
  leadSpeed: 170,
  /** Zoom = zoomBase - zoomSpeed * normalizedSpeed (zoom out at speed → shows
   * more road ahead + adds a sense of speed). */
  zoomBase: 1.0,
  zoomSpeed: 0.16,
  /** Per-frame lerp for the zoom change (kept slow so it breathes, not pops). */
  zoomLerp: 0.05,
} as const;

/**
 * 3D world scale + FREE-driving model (Three.js rewrite). Units are meters, so
 * the city and car read at realistic proportions. Free steering (hold to turn),
 * not the old grid buffered-turn model.
 */
export const World = {
  // Grid / city scale
  cols: 14,
  rows: 14,
  block: 60, // meters between road centerlines (block + road)
  roadWidth: 12, // drivable road width
  buildMinH: 10,
  buildMaxH: 48,
  // Car dimensions (meters)
  // Prepared Murphy hero bounds (the source is uniformly scaled to 5.8 m long).
  // Traffic assets are normalized to the same envelope for consistent road scale.
  car: { w: 2.4, l: 5.8, h: 1.63 },
  // Free driving. NOTE: top speed / acceleration / turn are now PER-VEHICLE
  // (`VehicleDef.drive`, meters) so the garage roster feels distinct — these
  // `cruiseSpeed`/`maxTurnRate` values are only the fallback when a car is built
  // without drive stats. The car climbs to speed at its `accel` **limit** (a fixed
  // m/s², not the old near-instant exponential ramp) and coasts/brakes at the
  // shared rates below.
  cruiseSpeed: 27, // m/s fallback top speed (~97 km/h) if no per-vehicle drive stats
  reverseSpeed: 7, // m/s cap when reversing
  coastDecel: 7, // m/s² natural slow-down off the gas (engine braking + drag)
  brakeDecel: 18, // m/s² hard brake when holding reverse while still rolling forward
  reverseAccel: 6, // m/s² backward acceleration once stopped (up to reverseSpeed)
  maxTurnRate: 2.5, // rad/s fallback steering rate if no per-vehicle drive stats
  turnSpeedRef: 8, // m/s at/above which full turn rate applies
  kmhFactor: 3.6, // m/s → km/h
  // Chase camera (meters)
  // Framed so the hero car sits in the lower third but stays fully visible above
  // the on-screen controls (shorter look-ahead lifts the car up the frame).
  cam: { dist: 11.5, height: 5.6, lookAhead: 7, lookHeight: 1.7 },
  // Traffic (AI cars) — meters/second + pool counts
  trafficMinSpeed: 6,
  trafficMaxSpeed: 12,
  trafficBaseCount: 12, // active cars at difficulty 0
  trafficMaxCount: 22, // active cars at difficulty 1
  trafficRadius: 210, // active/despawn radius around the player (m)
  trafficHitDist: 3.4, // centre distance for a collision (m)
} as const;

/** Three.js road-rule traffic: synchronized signals + car-following behaviour. */
export const TrafficRules = {
  greenSeconds: 7,
  amberSeconds: 1.4,
  allRedSeconds: 0.7,
  signalLookAhead: 34,
  stopBuffer: 3.15, // half the 5.8 m car + 0.25 m clear of the crossing edge
  acceleration: 3.4,
  brakeDecel: 8.5,
  minFollowingGap: 7.5,
  playerLookAhead: 42,
  playerStopGap: 2.2,
  playerSafetyMargin: 0.7,
} as const;

export const Juice = {
  shakeSmall: 0.004,
  shakeMed: 0.009,
  shakeBig: 0.016,
  hitStopMs: 60,
} as const;

/**
 * Per-mode city layout. The Manhattan grid can now carry **wide avenues**: every
 * `avenueEvery`-th grid line is a broad arterial (`avenueWidth`) instead of a normal
 * street (`roadWidth`). Rush keeps the tight tuned city; Serbest is a much larger
 * open city with wide highways cutting through it.
 */
export interface CityConfig {
  cols: number;
  rows: number;
  block: number;
  roadWidth: number;
  avenueWidth: number;
  /** Every Nth grid line is a wide avenue (0 = uniform streets). */
  avenueEvery: number;
  buildMinH: number;
  buildMaxH: number;
}

export const RUSH_CITY: CityConfig = {
  cols: World.cols,
  rows: World.rows,
  block: World.block,
  roadWidth: World.roadWidth,
  avenueWidth: World.roadWidth,
  avenueEvery: 0,
  buildMinH: World.buildMinH,
  buildMaxH: World.buildMaxH,
};

export const FREE_CITY: CityConfig = {
  cols: 24,
  rows: 24,
  block: 72,
  roadWidth: 16,
  avenueWidth: 36,
  avenueEvery: 6, // arterial grid every 6 blocks + a wide outer belt (line 0/24)
  buildMinH: 12,
  buildMaxH: 92,
};

/**
 * Shared navigation tuning (pickup/dropoff/POI arrival radius + nav-arrow
 * behaviour). Used by both RUSH's `Orders3D` and SERBEST's `JobBoard`/`Pois` so
 * "close enough to interact" means the same thing everywhere.
 */
export const Nav = {
  /** Radius (m) around a target at which pickup/dropoff/POI arrival registers. */
  reachM: 13,
  /** Below this distance to the target the nav arrow hides (you've arrived). */
  arrowHideM: 18,
  /** Stop-to-order trigger radius (m) around a source POI — same as `reachM`. */
  orderZoneRadius: 13,
  /** Below this speed (km/h) the player counts as "stopped" for stop-to-order. */
  stopThreshold: 4,
} as const;

/** SERBEST POI placement (world/Pois.ts). */
export const PoiSpawn = {
  /** Target number of POIs placed across FREE_CITY. */
  count: 18,
  /** Minimum Manhattan grid-cell spacing kept between two POI plots. */
  minGapCells: 2,
  /**
   * Metres a POI marker sits inside its plot's road-facing edge (not the plot's
   * geometric centre — that's always `block/2` from the nearest road, outside
   * `Nav.reachM`, and thus unreachable by a car confined to road corridors).
   */
  edgeInset: 6,
} as const;

/**
 * SERBEST open-world job-board economy (systems/JobBoard.ts). Persistent-wallet,
 * open-ended: earnings/penalties go straight to `Profile.coins` (no run timer).
 */
export const Econ = {
  payBase: 40, // flat coins
  payPerKm: 55, // coins per km of source→dest distance
  payComboStep: 0.15, // +15% pay per consecutive on-time delivery (streak)
  payComboCap: 2.5, // cap on the streak pay multiplier
  timePerKm: 42, // seconds of time limit granted per km (tune for feel)
  timeMin: 25, // floor on a job's time limit
  // Logarithmic late penalty: grows fast then flattens, never ruinous —
  //   penalty = round(min(penaltyBase, penaltyK * ln(1 + secondsLate))) * (special ? specialPenaltyMul : 1)
  penaltyK: 22,
  specialPayMul: 1.8, // daily special pay boost
  specialPenaltyMul: 0.3, // daily special penalty reduction
  refreshEverySec: 25, // re-roll offered jobs on this cadence (only while none active)
  // Stop-to-order (primary interaction): each source POI carries its own small
  // rotating slate of jobs, shown when the player stops right at it.
  ordersPerPoiMin: 2,
  ordersPerPoiMax: 4,
} as const;

/**
 * SERBEST city decoration from real GLB assets (world/CityDecor.ts): a distant
 * NY skyline ringing the city, plus school landmarks and colourful low-poly kit
 * buildings sprinkled onto reserved interior plots. All async-loaded so they never
 * block the first frame.
 */
export const Decor = {
  /** Height (m) of the NY skyscraper clusters ringing the city. Kept well above the
   *  ~92m tallest city blocks so the towers clearly rise over the rooftops and stay
   *  visible from the interior (down avenues), not just from the edges. */
  skylineHeight: 140,
  /** Skyline clusters placed along each of the 4 city edges. */
  skylinePerEdge: 4,
  /** How far outside the city edge the skyline sits, in blocks. */
  skylineOffsetBlocks: 1.5,
  /** School landmark buildings placed on their own reserved interior plots. */
  landmarkCount: 3,
  /**
   * Colourful low-poly kit buildings sprinkled onto reserved interior plots.
   * DISABLED (0): the `free_city_building_assets` GLB is a baked demo scene, not a
   * kit of separate buildings — stripping its ground leaves only thin degenerate
   * facade quads, so it can't be placed as a standalone block building. Flip this
   * on once a proper multi-building kit GLB (separate building nodes) is provided.
   */
  kitCount: 0,
} as const;

/**
 * SERBEST police, speeding & fines (world/Police.ts). A few patrol cars (the
 * `car_cop.glb` model) cruise the roads; flooring it past one on a normal street —
 * or crashing into traffic beside one — earns a coin fine and a short, escapable
 * chase. Kept deliberately minimal & fair: small fines, clear feedback, wide
 * avenues let you legally go full-tilt. All numbers live here.
 */
export const Police = {
  /** Number of patrol cars roaming FREE_CITY. */
  count: 3,
  /** Cruising speed while patrolling (m/s). */
  patrolSpeed: 9,
  /** Pursuit speed while chasing (m/s ≈ 72 km/h) — below the player's ~97 km/h
   *  cruise so a clean driver can outrun it on the straights. */
  chaseSpeed: 20,
  /** Cop steering rate (rad/s) when seeking its target. */
  turnRate: 2.2,
  /** Speed limit on normal streets (km/h). Full gas (~97) is over it → risk. */
  streetLimitKmh: 66,
  /** Speed limit on wide avenues (km/h) — arterials let you legally floor it. */
  avenueLimitKmh: 100,
  /** A cop notices speeding / a nearby crash within this radius (m). */
  noticeRadius: 44,
  /** Coin fine for speeding past a cop. */
  fine: 60,
  /** Coin fine for crashing into traffic beside a cop. */
  crashFine: 40,
  /** Grace (s) before a cop can fine again (also applied to every cop on escape). */
  fineDebounceSec: 8,
  /** Other cops within this radius (m) of the trigger also join the chase. */
  chaseConvergeRadius: 90,
  /** Escape when you're at least this far (m) from every chasing cop… */
  escapeDist: 135,
  /** …continuously for this many seconds. */
  escapeSec: 4,
  /** Reposition a patrol cop that drifts beyond this radius (m) from the player. */
  patrolRadius: 280,
} as const;

/**
 * Garage / Car Gallery (world/CarPreview.ts, ui/GarageScreen.ts). The roster
 * browsing screen: a rotating car on a showroom platform + stat bars computed
 * from `driveStatsAtLevel`. Fixed 3/4 hero camera; ranges below are the min/max
 * across the whole roster (see data/vehicles.ts) used to normalize each stat bar
 * to 0..1.
 */
export const Garage = {
  /** Turntable spin rate (rad/s) applied to the car holder each frame. */
  spinSpeed: 0.5,
  /** Showroom platform disc (meters). */
  platformRadius: 3.2,
  platformHeight: 0.22,
  /**
   * Fixed 3/4 hero camera framing for the whole garage screen. `fov` is a
   * garage-only override of the shared engine camera's vertical FOV (52° —
   * tuned for the chase camera), restored automatically on the next page load
   * since every mode boots a fresh `Game`. A narrower FOV at the old (52°)
   * setting clipped the car's front/rear off-screen for a real ~65° band of
   * the turntable spin (verified by sweeping every 15° of rotation + reading
   * screenshots — the car's diagonal 3/4 profile is wider on screen than
   * either its pure front or pure broadside view). This wider FOV + pulled-back
   * position keeps the full car in frame at every rotation angle with margin,
   * while also sitting bigger/higher in the stage (less dead air above it)
   * than the old cropped framing.
   */
  camPos: { x: 5.6, y: 2.9, z: 8.7 },
  camLook: { x: 0, y: 1.0, z: 0 },
  fov: 64,
  /** Studio background tone (replaces the sky while in the garage). */
  bg: 0x121a26,
  /** Stat-bar normalization ranges: [min, max] across the roster at any level. */
  statRange: {
    topSpeed: [15, 42] as [number, number], // m/s
    accel: [4, 20] as [number, number], // m/s^2
    turn: [2.2, 3.0] as [number, number], // rad/s
  },
} as const;

/**
 * Vehicle feel / juice (world/Vehicle3D.ts). Lightweight visual animation layer —
 * front-wheel steering, body lean and accel/brake pitch — applied to the model's visual holder, never to the transform
 * used for grid collision/position, so handling stays identical.
 */
export const VehicleFeel = {
  /** Front-tyre visual lock at full steering input (radians). */
  maxWheelAngle: 0.32,
  /** Damping rate for front tyres returning to/away from centre. */
  wheelSteerLambda: 10,
  /** Body roll into a turn at full lean (radians). */
  maxLean: 0.06,
  /** Damp rate (per second) for body lean easing toward its steer-driven target. */
  leanLambda: 6,
  /** Accel/brake pitch: radians of nose lift/dive per (m/s^2) of acceleration. */
  pitchGain: 0.003,
  /** Damp rate (per second) for the accel/brake pitch easing toward its target. */
  pitchLambda: 8,
} as const;
