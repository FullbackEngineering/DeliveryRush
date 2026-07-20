import * as THREE from 'three';
import { Grid } from '@/world/Grid';
import { Rng } from '@/utils/Rng';
import { Police as P, TrafficRules, World } from '@/core/Balance';
import { Vehicle3D } from '@/world/Vehicle3D';
import { Profile } from '@/managers/ProfileStore';
import { clamp } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';
import { RoadAxis, TrafficSignals } from '@/world/TrafficSignals';

interface Cop {
  object: THREE.Group;
  matL: THREE.MeshStandardMaterial; // roof light (red)
  matR: THREE.MeshStandardMaterial; // roof light (blue)
  state: 'patrol' | 'chase';
  x: number;
  z: number;
  yaw: number;
  axis: RoadAxis;
  line: number;
  laneHalf: number;
  pos: number;
  dir: 1 | -1;
  speed: number;
  playerBrake: boolean;
  fineCooldown: number; // seconds until this cop may fine again
}

/**
 * SERBEST police, speeding & fines. A few patrol cars (the `car_cop.glb` model)
 * seek roving waypoints on the road grid. Flooring it past one on a normal street
 * — or crashing into traffic beside one — earns a coin fine and a short, escapable
 * chase: the triggering cop (plus any nearby) switches to pursuit, and you escape
 * by getting `escapeDist` away from every chasing cop for `escapeSec`. Deliberately
 * minimal & fair (small fines, wide avenues let you legally floor it, clear
 * feedback). All numbers in `Balance.Police`; coins mutate only via `Profile`.
 */
export class Police {
  readonly group = new THREE.Group();

  private cops: Cop[] = [];
  private chasing = false;
  private escapeTimer = 0;
  private t = 0;
  private live = false;
  private lastOver = false;
  private px = 0;
  private pz = 0;

  constructor(
    private grid: Grid,
    private rng: Rng,
    template: THREE.Object3D | null = null,
    private signals: TrafficSignals | null = null,
  ) {
    for (let i = 0; i < P.count; i++) {
      const cop = this.buildCop(template);
      this.spawnPatrol(cop);
      this.cops.push(cop);
      this.group.add(cop.object);
    }
    bus.on(GameEvent.Crash, this.onCrash);
  }

  /** Drop the crash subscription (world teardown / future in-place reset). */
  destroy(): void {
    bus.off(GameEvent.Crash, this.onCrash);
  }

  get isChasing(): boolean { return this.chasing; }

  /** Stable patrol snapshot for browser playtests and tuning diagnostics. */
  debugState(): {
    chasing: boolean;
    patrols: number;
    rightLaneViolations: number;
    cardinalHeadingViolations: number;
    stoppedForPlayer: number;
  } {
    const patrols = this.cops.filter((cop) => cop.state === 'patrol');
    return {
      chasing: this.chasing,
      patrols: patrols.length,
      rightLaneViolations: patrols.filter((cop) => {
        const expectedX = cop.axis === 'z' ? cop.line - cop.dir * cop.laneHalf : cop.pos;
        const expectedZ = cop.axis === 'z' ? cop.pos : cop.line + cop.dir * cop.laneHalf;
        return cop.laneHalf <= 0 || Math.hypot(cop.x - expectedX, cop.z - expectedZ) > 0.02;
      }).length,
      cardinalHeadingViolations: patrols.filter((cop) => {
        const expected = cop.axis === 'z'
          ? (cop.dir > 0 ? 0 : Math.PI)
          : (cop.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        return Math.abs(Math.atan2(Math.sin(cop.yaw - expected), Math.cos(cop.yaw - expected))) > 0.01;
      }).length,
      stoppedForPlayer: patrols.filter((cop) => cop.playerBrake && cop.speed < 0.2).length,
    };
  }

  // --- Per-frame ------------------------------------------------------------
  update(dt: number, vehicle: Vehicle3D, live: boolean): void {
    this.t += dt;
    this.px = vehicle.x;
    this.pz = vehicle.z;
    this.live = live;

    for (const cop of this.cops) cop.fineCooldown = Math.max(0, cop.fineCooldown - dt);

    if (this.chasing) {
      // Escape check: the closest chasing cop must stay beyond escapeDist.
      let minD = Infinity;
      for (const cop of this.cops) {
        if (cop.state !== 'chase') continue;
        minD = Math.min(minD, Math.hypot(cop.x - this.px, cop.z - this.pz));
      }
      if (minD > P.escapeDist) this.escapeTimer += dt;
      else this.escapeTimer = 0;
      if (this.escapeTimer >= P.escapeSec) this.endChase();
    } else if (live && this.isSpeeding(vehicle)) {
      // Speeding past a patrol cop within notice range → fine + chase.
      for (const cop of this.cops) {
        if (cop.state !== 'patrol' || cop.fineCooldown > 0) continue;
        if (Math.hypot(cop.x - this.px, cop.z - this.pz) <= P.noticeRadius) {
          this.startChase(cop, 'speeding', P.fine);
          break;
        }
      }
    }

    // HUD hint: is the player currently over the local limit?
    const over = live && this.isSpeeding(vehicle);
    if (over !== this.lastOver) {
      this.lastOver = over;
      bus.emit(GameEvent.Speeding, over);
    }

    for (const cop of this.cops) {
      if (cop.state === 'chase') {
        this.moveCop(cop, dt, this.px, this.pz, P.chaseSpeed);
      } else {
        this.updatePatrol(cop, dt, vehicle);
      }
      this.updateLights(cop);
    }
  }

  // --- Chase lifecycle ------------------------------------------------------
  private startChase(cop: Cop, reason: 'speeding' | 'crash', amount: number): void {
    Profile.addCoins(-amount);
    bus.emit(GameEvent.PoliceFine, amount, reason);
    bus.emit(GameEvent.Sfx, 'crash');
    bus.emit(GameEvent.Haptic, 'heavy');
    this.chasing = true;
    this.escapeTimer = 0;
    cop.state = 'chase';
    cop.fineCooldown = P.fineDebounceSec;
    // Nearby cops converge on the pursuit.
    for (const other of this.cops) {
      if (other === cop) continue;
      if (Math.hypot(other.x - this.px, other.z - this.pz) < P.chaseConvergeRadius) other.state = 'chase';
    }
    bus.emit(GameEvent.ChaseStarted);
  }

  private endChase(): void {
    this.chasing = false;
    this.escapeTimer = 0;
    for (const cop of this.cops) {
      cop.state = 'patrol';
      cop.fineCooldown = P.fineDebounceSec; // grace so you aren't instantly re-fined
      this.resumePatrol(cop);
    }
    bus.emit(GameEvent.ChaseEnded);
  }

  private onCrash = (): void => {
    if (!this.live || this.chasing) return;
    let best: Cop | null = null;
    let bestD: number = P.noticeRadius;
    for (const cop of this.cops) {
      if (cop.state !== 'patrol' || cop.fineCooldown > 0) continue;
      const d = Math.hypot(cop.x - this.px, cop.z - this.pz);
      if (d < bestD) { bestD = d; best = cop; }
    }
    if (best) this.startChase(best, 'crash', P.crashFine);
  };

  // --- Rules ----------------------------------------------------------------
  private isSpeeding(vehicle: Vehicle3D): boolean {
    const limit = this.onAvenue(vehicle.x, vehicle.z) ? P.avenueLimitKmh : P.streetLimitKmh;
    return vehicle.speedKmh > limit;
  }

  /** True when the player is driving on a wide avenue (arterial), where a higher
   *  limit applies — so avenues are the legal "floor it" lanes. */
  private onAvenue(x: number, z: number): boolean {
    const b = this.grid.block;
    const colLine = Math.round(x / b);
    const rowLine = Math.round(z / b);
    const onV = this.grid.isAvenue(colLine) && Math.abs(x - colLine * b) <= this.grid.halfAt(colLine);
    const onH = this.grid.isAvenue(rowLine) && Math.abs(z - rowLine * b) <= this.grid.halfAt(rowLine);
    return onV || onH;
  }

  // --- Movement -------------------------------------------------------------
  /** Seek (targetX,targetZ) at `speed`, turning toward it and wall-sliding on the
   *  road grid — the same corridor collision the player uses, so cops stay on roads. */
  private moveCop(cop: Cop, dt: number, targetX: number, targetZ: number, speed: number): void {
    const dx = targetX - cop.x;
    const dz = targetZ - cop.z;
    let err = Math.atan2(dx, dz) - cop.yaw;
    while (err > Math.PI) err -= 2 * Math.PI;
    while (err < -Math.PI) err += 2 * Math.PI;
    const maxTurn = P.turnRate * dt;
    cop.yaw += clamp(err, -maxTurn, maxTurn);

    const nx = cop.x + Math.sin(cop.yaw) * speed * dt;
    const nz = cop.z + Math.cos(cop.yaw) * speed * dt;
    const road = this.grid.resolveRoads(nx, nz, 0.6);
    cop.x = this.grid.clampX(road.x, this.grid.roadHalf);
    cop.z = this.grid.clampZ(road.z, this.grid.roadHalf);
    cop.object.position.set(cop.x, 0, cop.z);
    cop.object.rotation.y = cop.yaw;
  }

  /** Patrol uses the exact same straight, right-hand lane model as Traffic3D. */
  private updatePatrol(cop: Cop, dt: number, vehicle: Vehicle3D): void {
    const distance = Math.hypot(cop.x - this.px, cop.z - this.pz);
    const offWorld = cop.x < -20 || cop.x > this.grid.worldW + 20
      || cop.z < -20 || cop.z > this.grid.worldD + 20;
    if (offWorld || distance > P.patrolRadius) {
      this.spawnPatrol(cop, this.px, this.pz);
      return;
    }

    let desiredSpeed: number = P.patrolSpeed;
    const signalStop = this.redLightStop(cop);
    if (signalStop && signalStop.distance <= TrafficRules.signalLookAhead) {
      desiredSpeed = Math.min(
        desiredSpeed,
        Math.sqrt(2 * TrafficRules.brakeDecel * Math.max(0, signalStop.distance - 0.35)),
      );
    }
    const leadGap = this.distanceToLeadCop(cop);
    if (leadGap !== null) {
      desiredSpeed = Math.min(desiredSpeed, Math.max(0, (leadGap - TrafficRules.minFollowingGap) * 1.15));
    }
    const playerStop = this.playerStop(cop, vehicle);
    cop.playerBrake = playerStop !== null;
    if (playerStop) {
      desiredSpeed = Math.min(
        desiredSpeed,
        Math.sqrt(2 * TrafficRules.brakeDecel
          * Math.max(0, playerStop.gap - TrafficRules.playerStopGap)),
      );
    }

    const rate = cop.speed < desiredSpeed ? TrafficRules.acceleration : TrafficRules.brakeDecel;
    cop.speed += Math.sign(desiredSpeed - cop.speed) * Math.min(Math.abs(desiredSpeed - cop.speed), rate * dt);
    const previousPos = cop.pos;
    cop.pos += cop.dir * cop.speed * dt;
    if (signalStop && cop.dir * (signalStop.position - previousPos) >= 0
      && cop.dir * (cop.pos - signalStop.position) > 0) {
      cop.pos = signalStop.position;
      cop.speed = 0;
    }
    if (playerStop && cop.dir * (playerStop.position - previousPos) >= 0
      && cop.dir * (cop.pos - playerStop.position) > 0) {
      cop.pos = playerStop.position;
      cop.speed = 0;
    }
    this.syncPatrolPose(cop);
  }

  private spawnPatrol(cop: Cop, anchorX?: number, anchorZ?: number): void {
    cop.axis = this.rng.chance(0.5) ? 'z' : 'x';
    cop.dir = this.rng.chance(0.5) ? 1 : -1;
    const fixedCount = cop.axis === 'z' ? this.grid.cols : this.grid.rows;
    const fixedAnchor = cop.axis === 'z' ? anchorX : anchorZ;
    const idx = fixedAnchor === undefined
      ? this.rng.int(1, Math.max(1, fixedCount - 1))
      : clamp(Math.round(fixedAnchor / this.grid.block) + this.rng.int(-3, 3), 1, fixedCount - 1);
    cop.line = idx * this.grid.block;
    cop.laneHalf = this.grid.halfAt(idx) * 0.5;

    const movingCount = cop.axis === 'z' ? this.grid.rows : this.grid.cols;
    const movingAnchor = cop.axis === 'z' ? anchorZ : anchorX;
    if (movingAnchor === undefined) {
      cop.pos = this.rng.range(this.grid.block, Math.max(this.grid.block, (movingCount - 1) * this.grid.block));
    } else {
      const offset = this.rng.range(55, Math.max(60, P.patrolRadius * 0.72));
      cop.pos = movingAnchor + (this.rng.chance(0.5) ? offset : -offset);
    }
    cop.speed = P.patrolSpeed * this.rng.range(0.78, 1);
    cop.playerBrake = false;
    this.syncPatrolPose(cop);
  }

  /** Snap a chase car back to the closest legal lane without a visible teleport. */
  private resumePatrol(cop: Cop): void {
    const b = this.grid.block;
    const col = clamp(Math.round(cop.x / b), 1, this.grid.cols - 1);
    const row = clamp(Math.round(cop.z / b), 1, this.grid.rows - 1);
    const verticalDistance = Math.abs(cop.x - col * b);
    const horizontalDistance = Math.abs(cop.z - row * b);
    cop.axis = verticalDistance <= horizontalDistance ? 'z' : 'x';
    const idx = cop.axis === 'z' ? col : row;
    cop.line = idx * b;
    cop.laneHalf = this.grid.halfAt(idx) * 0.5;
    cop.dir = (cop.axis === 'z' ? Math.cos(cop.yaw) : Math.sin(cop.yaw)) >= 0 ? 1 : -1;
    cop.pos = cop.axis === 'z' ? cop.z : cop.x;
    cop.speed = Math.min(P.patrolSpeed, P.chaseSpeed * 0.5);
    cop.playerBrake = false;
    this.syncPatrolPose(cop);
  }

  private syncPatrolPose(cop: Cop): void {
    cop.x = cop.axis === 'z' ? cop.line - cop.dir * cop.laneHalf : cop.pos;
    cop.z = cop.axis === 'z' ? cop.pos : cop.line + cop.dir * cop.laneHalf;
    cop.yaw = cop.axis === 'z'
      ? (cop.dir > 0 ? 0 : Math.PI)
      : (cop.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    cop.object.position.set(cop.x, 0, cop.z);
    cop.object.rotation.y = cop.yaw;
  }

  private redLightStop(cop: Cop): { position: number; distance: number } | null {
    if (!this.signals || this.signals.colorFor(cop.axis) === 'green') return null;
    const block = this.grid.block;
    const lineCount = cop.axis === 'z' ? this.grid.rows : this.grid.cols;
    const next = cop.dir > 0
      ? Math.floor((cop.pos + 0.001) / block) + 1
      : Math.ceil((cop.pos - 0.001) / block) - 1;
    if (next <= 0 || next >= lineCount) return null;
    const position = next * block - cop.dir * (this.grid.halfAt(next) + TrafficRules.stopBuffer);
    const distance = cop.dir * (position - cop.pos);
    if (distance < 0) return null;
    if (this.signals.colorFor(cop.axis) === 'amber') {
      const safeBrakeDistance = (cop.speed * cop.speed) / (2 * TrafficRules.brakeDecel) + 1;
      if (distance < safeBrakeDistance) return null;
    }
    return { position, distance };
  }

  private distanceToLeadCop(cop: Cop): number | null {
    let nearest = Infinity;
    for (const other of this.cops) {
      if (other === cop || other.state !== 'patrol' || other.axis !== cop.axis || other.dir !== cop.dir) continue;
      if (Math.abs(other.line - cop.line) > 0.1) continue;
      const gap = cop.dir * (other.pos - cop.pos) - World.car.l;
      if (gap >= 0 && gap < nearest) nearest = gap;
    }
    return Number.isFinite(nearest) ? nearest : null;
  }

  private playerStop(cop: Cop, vehicle: Vehicle3D): { gap: number; position: number } | null {
    const sin = Math.abs(Math.sin(vehicle.yaw));
    const cos = Math.abs(Math.cos(vehicle.yaw));
    const halfW = World.car.w * 0.5;
    const halfL = World.car.l * 0.5;
    const playerExtentX = cos * halfW + sin * halfL;
    const playerExtentZ = sin * halfW + cos * halfL;
    const laneCoord = cop.axis === 'z' ? cop.x : cop.z;
    const playerLateral = cop.axis === 'z' ? vehicle.x : vehicle.z;
    const playerLateralExtent = cop.axis === 'z' ? playerExtentX : playerExtentZ;
    if (Math.abs(playerLateral - laneCoord)
      > playerLateralExtent + halfW + TrafficRules.playerSafetyMargin) return null;
    const playerLongitudinal = cop.axis === 'z' ? vehicle.z : vehicle.x;
    const playerLongitudinalExtent = cop.axis === 'z' ? playerExtentZ : playerExtentX;
    const gap = cop.dir * (playerLongitudinal - cop.pos) - halfL - playerLongitudinalExtent;
    if (gap < 0 || gap > TrafficRules.playerLookAhead) return null;
    return {
      gap,
      position: playerLongitudinal
        - cop.dir * (halfL + playerLongitudinalExtent + TrafficRules.playerStopGap),
    };
  }

  // --- Visuals --------------------------------------------------------------
  private updateLights(cop: Cop): void {
    if (cop.state !== 'chase') {
      cop.matL.emissiveIntensity = 0.12;
      cop.matR.emissiveIntensity = 0.12;
      return;
    }
    const on = Math.floor(this.t * 6) % 2 === 0; // ~6Hz alternate flash
    cop.matL.emissiveIntensity = on ? 1.7 : 0.08;
    cop.matR.emissiveIntensity = on ? 0.08 : 1.7;
  }

  private buildCop(template: THREE.Object3D | null): Cop {
    const object = new THREE.Group();
    if (template) object.add(template.clone(true));
    else this.buildBoxCop(object);

    // Roof light bar (two emissive pods) — flashes red/blue during a chase.
    const matL = new THREE.MeshStandardMaterial({ color: 0xff3838, emissive: 0xff1a1a, emissiveIntensity: 0.12, roughness: 0.45 });
    const matR = new THREE.MeshStandardMaterial({ color: 0x4472ff, emissive: 0x2244ff, emissiveIntensity: 0.12, roughness: 0.45 });
    const pod = new THREE.BoxGeometry(0.52, 0.26, 0.66);
    const l = new THREE.Mesh(pod, matL); l.position.set(-0.38, 1.62, -0.15);
    const r = new THREE.Mesh(pod, matR); r.position.set(0.38, 1.62, -0.15);
    object.add(l, r);
    return {
      object, matL, matR, state: 'patrol', x: 0, z: 0, yaw: 0,
      axis: 'z', line: 0, laneHalf: 4, pos: 0, dir: 1, speed: P.patrolSpeed,
      playerBrake: false, fineCooldown: 0,
    };
  }

  /** Procedural white police car — fallback when the cop GLB isn't available
   *  (offline/headless). Same footprint as `Vehicle3D`'s box car. */
  private buildBoxCop(g: THREE.Group): void {
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 }),
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
    };
    box(2.1, 0.85, 4.4, 0xf3f4f6, 0, 0.72, 0);        // white body
    box(2.12, 0.5, 1.2, 0x1b2330, 0, 0.72, 0);        // dark door band
    box(1.8, 0.66, 2.2, 0x22303f, 0, 1.32, -0.25);    // cabin
    box(0.36, 0.62, 1.05, 0x0d0f14, -1.02, 0.42, 1.35);
    box(0.36, 0.62, 1.05, 0x0d0f14, 1.02, 0.42, 1.35);
    box(0.36, 0.62, 1.05, 0x0d0f14, -1.02, 0.42, -1.35);
    box(0.36, 0.62, 1.05, 0x0d0f14, 1.02, 0.42, -1.35);
  }
}
