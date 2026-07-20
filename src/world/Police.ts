import * as THREE from 'three';
import { Grid } from '@/world/Grid';
import { Rng } from '@/utils/Rng';
import { Police as P } from '@/core/Balance';
import { Vehicle3D } from '@/world/Vehicle3D';
import { Profile } from '@/managers/ProfileStore';
import { clamp } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';

interface Cop {
  object: THREE.Group;
  matL: THREE.MeshStandardMaterial; // roof light (red)
  matR: THREE.MeshStandardMaterial; // roof light (blue)
  state: 'patrol' | 'chase';
  x: number;
  z: number;
  yaw: number;
  wpx: number; // patrol waypoint
  wpz: number;
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

  constructor(private grid: Grid, private rng: Rng, template: THREE.Object3D | null = null) {
    for (let i = 0; i < P.count; i++) {
      const cop = this.buildCop(template);
      const node = this.randomInteriorNode();
      cop.x = node.x;
      cop.z = node.z;
      cop.yaw = this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      cop.object.position.set(cop.x, 0, cop.z);
      cop.object.rotation.y = cop.yaw;
      this.newWaypoint(cop);
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
        if (Math.hypot(cop.wpx - cop.x, cop.wpz - cop.z) < 10) this.newWaypoint(cop);
        if (Math.hypot(cop.x - this.px, cop.z - this.pz) > P.patrolRadius) this.respawnNear(cop);
        this.moveCop(cop, dt, cop.wpx, cop.wpz, P.patrolSpeed);
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
      this.newWaypoint(cop);
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

  private newWaypoint(cop: Cop): void {
    const b = this.grid.block;
    const col = clamp(Math.round(cop.x / b) + this.rng.int(-3, 3), 1, this.grid.cols - 1);
    const row = clamp(Math.round(cop.z / b) + this.rng.int(-3, 3), 1, this.grid.rows - 1);
    cop.wpx = col * b;
    cop.wpz = row * b;
  }

  /** Reposition a patrol cop that has drifted too far back onto a road near the
   *  player, so the city always feels lightly policed around you. */
  private respawnNear(cop: Cop): void {
    const b = this.grid.block;
    const col = clamp(Math.round(this.px / b) + this.rng.int(-4, 4), 1, this.grid.cols - 1);
    const row = clamp(Math.round(this.pz / b) + this.rng.int(-4, 4), 1, this.grid.rows - 1);
    cop.x = col * b;
    cop.z = row * b;
    cop.object.position.set(cop.x, 0, cop.z);
    this.newWaypoint(cop);
  }

  private randomInteriorNode(): { x: number; z: number } {
    const col = this.rng.int(2, Math.max(2, this.grid.cols - 2));
    const row = this.rng.int(2, Math.max(2, this.grid.rows - 2));
    return { x: col * this.grid.block, z: row * this.grid.block };
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
    return { object, matL, matR, state: 'patrol', x: 0, z: 0, yaw: 0, wpx: 0, wpz: 0, fineCooldown: 0 };
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
