import * as THREE from 'three';
import { World, Traffic, TrafficRules } from '@/core/Balance';
import { Grid } from '@/world/Grid';
import { Rng } from '@/utils/Rng';
import { Vehicle3D } from '@/world/Vehicle3D';
import { bus, GameEvent } from '@/core/EventBus';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { loadGLB } from '@/world/ModelLoader';
import pedPhoneWalkUrl from '@/assets/models/ped_phone_walk.glb?url';
import pedMale03Url from '@/assets/models/ped_male03.glb?url';
import trafficPackUrl from '@/assets/models/traffic_pack_lp.glb?url';

type RoadAxis = 'x' | 'z';
type SignalColor = 'green' | 'amber' | 'red';

interface Car {
  active: boolean;
  axis: RoadAxis; // road orientation the car drives along
  line: number; // the fixed coordinate of that road (m)
  laneHalf: number; // right-hand lane offset for this road (scales with its width)
  pos: number; // moving coordinate along the road (m)
  dir: number; // +1 / -1
  speed: number; // current m/s
  cruiseSpeed: number; // desired free-flow speed
  variant: number; // random supplied-asset visual
  nearFlag: boolean; // near-miss latch (one event per pass)
  playerBrake: boolean; // currently yielding to the player's occupied path
}

interface Pedestrian {
  axis: 'x' | 'z';
  x: number;
  z: number;
  span: number;
  phase: number;
  speed: number;
  variant: number;
  slot: number;
}

/**
 * Pooled low-poly AI traffic. Cars cruise straight lanes on the road grid (right-
 * hand offset so opposing lanes separate), recycling when they leave a radius
 * around the player. Rendered as just two InstancedMeshes (bodies + cabins) — the
 * whole fleet costs 2 draw calls. Colliding with the player triggers a crash +
 * combo break; a fast close pass fires a near-miss for juice.
 */
export class Traffic3D {
  readonly group = new THREE.Group();

  private cars: Car[] = [];
  private target: number = World.trafficBaseCount;

  private bodies: THREE.InstancedMesh;
  private cabins: THREE.InstancedMesh;
  private vehicleLights: THREE.InstancedMesh;
  private trafficModelMeshes: THREE.InstancedMesh[] = [];
  private trafficModelsReady = false;
  private trafficModelStatus = 'loading';
  private signalTimer = 0;
  private signalColorZ: SignalColor = 'green';
  private signalColorX: SignalColor = 'red';
  private signalHousings: THREE.InstancedMesh;
  private signalLenses: THREE.InstancedMesh;
  private signalApproaches: Array<{ axis: RoadAxis; matrix: THREE.Matrix4 }> = [];
  private pedestrians: Pedestrian[] = [];
  private pedestrianFallback: THREE.InstancedMesh;
  private pedestrianMeshes: THREE.InstancedMesh[] = [];
  private pedestrianVariantCounts = [0, 0];
  private pedestrianModelsReady = false;
  private colorSet = [0xe4572e, 0x3b82f6, 0xf5a524, 0x2ec4b6, 0x9b5de5, 0xef476f, 0xededed, 0x2b2d42];

  // Scratch objects (avoid per-frame allocs).
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);
  private col = new THREE.Color();
  private zero = new THREE.Vector3(0, 0, 0);

  constructor(private grid: Grid, private rng: Rng) {
    const n = Traffic.poolSize;
    this.bodies = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.0, 0.9, 4.2),
      new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }),
      n,
    );
    this.cabins = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.7, 0.62, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.5 }),
      n,
    );
    const frontLight = coloredBox(0xfff2bd);
    frontLight.translate(0, 0.78, World.car.l * 0.5 + 0.02);
    const rearLight = coloredBox(0xff334c);
    rearLight.translate(0, 0.76, -World.car.l * 0.5 - 0.02);
    this.vehicleLights = new THREE.InstancedMesh(
      mergeGeometries([frontLight, rearLight], false)!,
      new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      n,
    );
    const signals = this.buildTrafficSignals();
    this.signalHousings = signals.housings;
    this.signalLenses = signals.lenses;
    const pedestrianCount = Math.min(48, Math.max(24, Math.floor((grid.cols * grid.rows) / 12)));
    const pedBody = new THREE.CylinderGeometry(0.32, 0.38, 1.35, 6);
    pedBody.translate(0, 1.18, 0);
    const pedHead = new THREE.SphereGeometry(0.31, 7, 5);
    pedHead.translate(0, 2.08, 0);
    this.pedestrianFallback = new THREE.InstancedMesh(
      mergeGeometries([pedBody, pedHead], false)!,
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      pedestrianCount,
    );
    this.bodies.castShadow = true;
    this.bodies.frustumCulled = false;
    this.cabins.frustumCulled = false;
    this.vehicleLights.frustumCulled = false;
    this.pedestrianFallback.frustumCulled = false;

    for (let i = 0; i < n; i++) {
      this.cars.push({
        active: false, axis: 'z', line: 0, laneHalf: 4, pos: 0, dir: 1,
        speed: 8, cruiseSpeed: 8, variant: this.rng.int(0, 3), nearFlag: false,
        playerBrake: false,
      });
      this.bodies.setColorAt(i, this.col.setHex(this.colorSet[i % this.colorSet.length]));
    }
    const shirtColors = [0x2f80ed, 0xeb5757, 0x27ae60, 0xf2c94c, 0x9b51e0, 0xe0e0e0];
    for (let i = 0; i < pedestrianCount; i++) {
      const axis = this.rng.chance(0.5) ? 'x' : 'z';
      const c = this.rng.int(1, Math.max(1, grid.cols - 1));
      const r = this.rng.int(1, Math.max(1, grid.rows - 1));
      const side = this.rng.chance(0.5) ? 1 : -1;
      const x = c * grid.block + (axis === 'z' ? side * (grid.halfAt(c) + 1.6) : 0);
      const z = r * grid.block + (axis === 'x' ? side * (grid.halfAt(r) + 1.6) : 0);
      const span = axis === 'x' ? grid.halfAt(c) + 3 : grid.halfAt(r) + 3;
      const variant = i % this.pedestrianVariantCounts.length;
      const slot = this.pedestrianVariantCounts[variant]++;
      this.pedestrians.push({
        axis, x, z, span, phase: this.rng.range(0, 2), speed: this.rng.range(0.12, 0.24),
        variant, slot,
      });
      this.pedestrianFallback.setColorAt(i, this.col.setHex(shirtColors[i % shirtColors.length]));
    }
    this.hideAll();
    this.updatePedestrians(0);
    this.group.add(
      this.bodies, this.cabins, this.vehicleLights, this.pedestrianFallback,
      this.signalHousings, this.signalLenses,
    );
    void this.loadPedestrianModels();
    void this.loadTrafficModels();
  }

  /** Ramp active-car count with run difficulty (0..1). */
  setDifficulty(d: number): void {
    this.target = Math.round(World.trafficBaseCount + (World.trafficMaxCount - World.trafficBaseCount) * d);
  }

  reset(): void {
    for (const c of this.cars) c.active = false;
    this.signalTimer = 0;
    this.updateSignals(0);
    this.hideAll();
  }

  /** Stable browser-playtest snapshot of traffic-rule state. */
  debugState(): {
    vertical: SignalColor;
    horizontal: SignalColor;
    active: number;
    stoppedAtRed: number;
    stoppedForPlayer: number;
    rightLaneViolations: number;
    singleModelViolations: number;
    modelBounds: Array<{ w: number; h: number; l: number }>;
    variants: number[];
  } {
    const active = this.cars.filter((car) => car.active);
    return {
      vertical: this.signalColorZ,
      horizontal: this.signalColorX,
      active: active.length,
      stoppedAtRed: active.filter((car) => {
        const stop = this.redLightStop(car);
        return !!stop && stop.distance < 1 && car.speed < 0.2;
      }).length,
      stoppedForPlayer: active.filter((car) => car.playerBrake && car.speed < 0.2).length,
      rightLaneViolations: active.filter((car) => car.laneHalf <= 0).length,
      singleModelViolations: this.trafficModelsReady
        ? active.filter((car) => this.visibleModelCount(this.cars.indexOf(car)) !== 1).length
        : 0,
      modelBounds: this.trafficModelMeshes.map((mesh) => {
        mesh.geometry.computeBoundingBox();
        const size = mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
        return { w: +size.x.toFixed(3), h: +size.y.toFixed(3), l: +size.z.toFixed(3) };
      }),
      variants: [...new Set(active.map((car) => car.variant))].sort(),
    };
  }

  update(dt: number, vehicle: Vehicle3D, live: boolean): void {
    const px = vehicle.x, pz = vehicle.z;
    let activeCount = 0;
    this.updateSignals(dt);

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (!car.active) continue;

      let desiredSpeed = car.cruiseSpeed;
      const stop = this.redLightStop(car);
      if (stop && stop.distance <= TrafficRules.signalLookAhead) {
        // Braking-distance curve reaches zero at the stop line without a pop.
        desiredSpeed = Math.min(
          desiredSpeed,
          Math.sqrt(2 * TrafficRules.brakeDecel * Math.max(0, stop.distance - 0.35)),
        );
      }
      const leadGap = this.distanceToLeadCar(car);
      if (leadGap !== null) {
        const followingSpeed = Math.max(0, (leadGap - TrafficRules.minFollowingGap) * 1.15);
        desiredSpeed = Math.min(desiredSpeed, followingSpeed);
      }
      const playerStop = this.playerStop(car, vehicle);
      car.playerBrake = playerStop !== null;
      if (playerStop) {
        // Treat the player's oriented car bounds like a moving lead vehicle.
        // This also covers a player sitting across the AI lane at a junction.
        desiredSpeed = Math.min(
          desiredSpeed,
          Math.sqrt(2 * TrafficRules.brakeDecel
            * Math.max(0, playerStop.gap - TrafficRules.playerStopGap)),
        );
      }

      const rate = car.speed < desiredSpeed ? TrafficRules.acceleration : TrafficRules.brakeDecel;
      car.speed += Math.sign(desiredSpeed - car.speed) * Math.min(Math.abs(desiredSpeed - car.speed), rate * dt);
      const previousPos = car.pos;
      car.pos += car.dir * car.speed * dt;
      // Numerical guard: never creep through a red stop line on a long frame.
      if (stop && car.dir * (stop.position - previousPos) >= 0 && car.dir * (car.pos - stop.position) > 0) {
        car.pos = stop.position;
        car.speed = 0;
      }
      // The continuous braking curve handles normal frames; this guard prevents
      // a long frame from stepping through the player's safety buffer.
      if (playerStop && car.dir * (playerStop.position - previousPos) >= 0
        && car.dir * (car.pos - playerStop.position) > 0) {
        car.pos = playerStop.position;
        car.speed = 0;
      }

      const pose = this.carWorldPose(car);
      const wx = pose.x;
      const wz = pose.z;

      // Recycle when it leaves the world or the radius around the player.
      const dx = wx - px, dz = wz - pz;
      const dist = Math.hypot(dx, dz);
      const off = wx < -20 || wx > this.grid.worldW + 20 || wz < -20 || wz > this.grid.worldD + 20;
      if (off || dist > World.trafficRadius) {
        this.respawn(car, px, pz);
        continue;
      }
      activeCount++;

      // Collision + near-miss against the player.
      if (live) {
        if (dist < World.trafficHitDist && !vehicle.isInvulnerable) {
          vehicle.crash();
          bus.emit(GameEvent.Crash);
          bus.emit(GameEvent.Sfx, 'crash');
          bus.emit(GameEvent.Haptic, 'heavy');
        } else if (dist < 7 && !car.nearFlag && vehicle.speedKmh > 30) {
          car.nearFlag = true;
          bus.emit(GameEvent.NearMiss);
          bus.emit(GameEvent.Sfx, 'nearmiss');
        } else if (dist > 9) {
          car.nearFlag = false;
        }
      }

      this.writeCar(i, wx, wz, pose.yaw);
    }

    // Keep the fleet filled toward the target.
    if (activeCount < this.target) {
      for (const car of this.cars) {
        if (!car.active) { this.respawn(car, px, pz); break; }
      }
    }

    this.bodies.instanceMatrix.needsUpdate = true;
    this.cabins.instanceMatrix.needsUpdate = true;
    this.vehicleLights.instanceMatrix.needsUpdate = true;
    for (const mesh of this.trafficModelMeshes) mesh.instanceMatrix.needsUpdate = true;
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    this.updatePedestrians(dt);
  }

  private respawn(car: Car, px: number, pz: number): void {
    const carIndex = this.cars.indexOf(car);
    if (this.trafficModelsReady && carIndex >= 0) this.hideTrafficModelSlot(carIndex, car.variant);
    car.axis = this.rng.chance(0.5) ? 'z' : 'x';
    car.dir = this.rng.chance(0.5) ? 1 : -1;
    car.cruiseSpeed = this.rng.range(World.trafficMinSpeed, World.trafficMaxSpeed);
    car.speed = car.cruiseSpeed * this.rng.range(0.72, 1);
    car.variant = this.rng.int(0, 3);
    car.nearFlag = false;
    car.playerBrake = false;
    const idx = this.pickLineIndex(car.axis === 'z' ? px : pz);
    car.line = idx * this.grid.block;
    car.laneHalf = this.grid.halfAt(idx) * 0.5; // right-hand lane, scaled to the road width
    const anchor = car.axis === 'z' ? pz : px;
    car.pos = anchor + this.spawnOffset();
    // Do not materialize inside another vehicle's safety envelope.
    for (let attempt = 0; attempt < 6 && this.distanceToLeadCar(car) !== null; attempt++) {
      const gap = this.distanceToLeadCar(car)!;
      if (gap >= TrafficRules.minFollowingGap * 1.6) break;
      car.pos = anchor + this.spawnOffset();
    }
    car.active = true;
    if (carIndex >= 0) {
      const pose = this.carWorldPose(car);
      this.writeCar(carIndex, pose.x, pose.z, pose.yaw);
    }
  }

  private carWorldPose(car: Car): { x: number; z: number; yaw: number } {
    // Right-hand traffic in XZ: right = forward × up. Therefore +Z uses -X,
    // -Z uses +X, +X uses +Z, and -X uses -Z. `laneHalf` is exactly the centre
    // of one directional half of the road, never the road edge or centre line.
    return {
      x: car.axis === 'z' ? car.line - car.dir * car.laneHalf : car.pos,
      z: car.axis === 'z' ? car.pos : car.line + car.dir * car.laneHalf,
      yaw: car.axis === 'z'
        ? (car.dir > 0 ? 0 : Math.PI)
        : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2),
    };
  }

  /** A road line index a few blocks from `coord`, kept interior. */
  private pickLineIndex(coord: number): number {
    const k = Math.round(coord / this.grid.block) + this.rng.int(-3, 3);
    return Math.max(1, Math.min(this.grid.cols - 1, k));
  }

  /** A spawn distance ahead/behind the player, never right on top of them. */
  private spawnOffset(): number {
    const d = this.rng.range(60, World.trafficRadius * 0.85);
    return this.rng.chance(0.5) ? d : -d;
  }

  private writeCar(i: number, x: number, z: number, yaw: number): void {
    this.q.setFromEuler(this.e.set(0, yaw, 0));
    if (this.trafficModelsReady) {
      this.v.set(x, 0.04, z);
      this.m.compose(this.v, this.q, this.one);
      this.trafficModelMeshes[this.cars[i].variant].setMatrixAt(i, this.m);
    } else {
      this.v.set(x, 0.6, z);
      this.m.compose(this.v, this.q, this.one);
      this.bodies.setMatrixAt(i, this.m);
      // Cabin sits up + slightly back along the car's heading.
      this.v.set(x - Math.sin(yaw) * 0.3, 1.32, z - Math.cos(yaw) * 0.3);
      this.m.compose(this.v, this.q, this.one);
      this.cabins.setMatrixAt(i, this.m);
    }
    // Wide light bars read clearly at chase-camera distance without adding a
    // point light per vehicle. They share two emissive instanced draw calls.
    this.v.set(x, 0, z);
    this.m.compose(this.v, this.q, this.one);
    this.vehicleLights.setMatrixAt(i, this.m);
  }

  private signalFor(axis: RoadAxis): SignalColor {
    return axis === 'z' ? this.signalColorZ : this.signalColorX;
  }

  private updateSignals(dt: number): void {
    const green = TrafficRules.greenSeconds;
    const amber = TrafficRules.amberSeconds;
    const allRed = TrafficRules.allRedSeconds;
    const halfCycle = green + amber + allRed;
    const cycle = halfCycle * 2;
    this.signalTimer = (this.signalTimer + dt) % cycle;
    const t = this.signalTimer;
    let z: SignalColor = 'red';
    let x: SignalColor = 'red';
    if (t < green) z = 'green';
    else if (t < green + amber) z = 'amber';
    else if (t >= halfCycle && t < halfCycle + green) x = 'green';
    else if (t >= halfCycle + green && t < halfCycle + green + amber) x = 'amber';
    if (z !== this.signalColorZ || x !== this.signalColorX) {
      this.signalColorZ = z;
      this.signalColorX = x;
      this.refreshSignalLenses();
    }
  }

  private redLightStop(car: Car): { position: number; distance: number } | null {
    const color = this.signalFor(car.axis);
    if (color === 'green') return null;
    const block = this.grid.block;
    const lineCount = car.axis === 'z' ? this.grid.rows : this.grid.cols;
    const next = car.dir > 0
      ? Math.floor((car.pos + 0.001) / block) + 1
      : Math.ceil((car.pos - 0.001) / block) - 1;
    if (next <= 0 || next >= lineCount) return null;
    const position = next * block - car.dir * (this.grid.halfAt(next) + TrafficRules.stopBuffer);
    const distance = car.dir * (position - car.pos);
    if (distance < 0) return null; // already committed to the intersection
    if (color === 'amber') {
      const safeBrakeDistance = (car.speed * car.speed) / (2 * TrafficRules.brakeDecel) + 1;
      if (distance < safeBrakeDistance) return null; // clear the junction; do not panic-stop
    }
    return { position, distance };
  }

  private distanceToLeadCar(car: Car): number | null {
    let nearest = Infinity;
    for (const other of this.cars) {
      if (other === car || !other.active || other.axis !== car.axis || other.dir !== car.dir) continue;
      if (Math.abs(other.line - car.line) > 0.1) continue;
      const bumperGap = car.dir * (other.pos - car.pos) - World.car.l;
      if (bumperGap >= 0 && bumperGap < nearest) nearest = bumperGap;
    }
    return Number.isFinite(nearest) ? nearest : null;
  }

  /**
   * Return the safe stop point when the player occupies this AI car's forward
   * corridor. The player's oriented rectangle is projected onto the AI road axis,
   * so yielding works both when both cars share a lane and when the player sits
   * sideways across that lane at an intersection.
   */
  private playerStop(car: Car, vehicle: Vehicle3D): { gap: number; position: number } | null {
    const pose = this.carWorldPose(car);
    const sin = Math.abs(Math.sin(vehicle.yaw));
    const cos = Math.abs(Math.cos(vehicle.yaw));
    const halfW = World.car.w * 0.5;
    const halfL = World.car.l * 0.5;
    const playerExtentX = cos * halfW + sin * halfL;
    const playerExtentZ = sin * halfW + cos * halfL;
    const laneCoord = car.axis === 'z' ? pose.x : pose.z;
    const playerLateral = car.axis === 'z' ? vehicle.x : vehicle.z;
    const playerLateralExtent = car.axis === 'z' ? playerExtentX : playerExtentZ;
    if (Math.abs(playerLateral - laneCoord)
      > playerLateralExtent + halfW + TrafficRules.playerSafetyMargin) return null;

    const playerLongitudinal = car.axis === 'z' ? vehicle.z : vehicle.x;
    const playerLongitudinalExtent = car.axis === 'z' ? playerExtentZ : playerExtentX;
    const gap = car.dir * (playerLongitudinal - car.pos) - halfL - playerLongitudinalExtent;
    if (gap < 0 || gap > TrafficRules.playerLookAhead) return null;
    return {
      gap,
      position: playerLongitudinal
        - car.dir * (halfL + playerLongitudinalExtent + TrafficRules.playerStopGap),
    };
  }

  private buildTrafficSignals(): { housings: THREE.InstancedMesh; lenses: THREE.InstancedMesh } {
    const pole = new THREE.CylinderGeometry(0.11, 0.14, 3.7, 6);
    pole.translate(0, 1.85, 0);
    const head = new THREE.BoxGeometry(0.62, 1.55, 0.34);
    head.translate(0, 3.65, 0);
    const housingGeometry = mergeGeometries([pole, head], false)!;
    pole.dispose(); head.dispose();

    const approaches: Array<{ axis: RoadAxis; x: number; z: number; yaw: number }> = [];
    const block = this.grid.block;
    for (let c = 1; c < this.grid.cols; c++) {
      for (let r = 1; r < this.grid.rows; r++) {
        const ix = c * block;
        const iz = r * block;
        const sideX = this.grid.halfAt(c) + 0.9;
        const sideZ = this.grid.halfAt(r) + 0.9;
        const stopX = this.grid.halfAt(c) + TrafficRules.stopBuffer;
        const stopZ = this.grid.halfAt(r) + TrafficRules.stopBuffer;
        approaches.push(
          { axis: 'z', x: ix - sideX, z: iz - stopZ, yaw: Math.PI },
          { axis: 'z', x: ix + sideX, z: iz + stopZ, yaw: 0 },
          { axis: 'x', x: ix - stopX, z: iz + sideZ, yaw: -Math.PI / 2 },
          { axis: 'x', x: ix + stopX, z: iz - sideZ, yaw: Math.PI / 2 },
        );
      }
    }

    const housings = new THREE.InstancedMesh(
      housingGeometry,
      new THREE.MeshStandardMaterial({ color: 0x27313c, roughness: 0.76, metalness: 0.18 }),
      approaches.length,
    );
    const lensGeometry = new THREE.SphereGeometry(0.19, 8, 6);
    const lenses = new THREE.InstancedMesh(
      lensGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      approaches.length * 3,
    );
    const base = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3(1, 1, 1);
    approaches.forEach((approach, index) => {
      base.compose(position.set(approach.x, 0, approach.z), rotation.setFromEuler(euler.set(0, approach.yaw, 0)), scale);
      housings.setMatrixAt(index, base);
      this.signalApproaches.push({ axis: approach.axis, matrix: base.clone() });
      [4.15, 3.65, 3.15].forEach((y, lens) => {
        local.makeTranslation(0, y, 0.2);
        lenses.setMatrixAt(index * 3 + lens, new THREE.Matrix4().multiplyMatrices(base, local));
      });
    });
    housings.instanceMatrix.needsUpdate = true;
    lenses.instanceMatrix.needsUpdate = true;
    housings.frustumCulled = false;
    lenses.frustumCulled = false;
    this.refreshSignalLenses(lenses);
    return { housings, lenses };
  }

  private refreshSignalLenses(target = this.signalLenses): void {
    if (!target) return;
    const active = {
      red: new THREE.Color(0xff334c),
      amber: new THREE.Color(0xffb020),
      green: new THREE.Color(0x2ee88b),
    } as const;
    const dim = {
      red: new THREE.Color(0x35131a),
      amber: new THREE.Color(0x352b16),
      green: new THREE.Color(0x123522),
    } as const;
    const colors: SignalColor[] = ['red', 'amber', 'green'];
    this.signalApproaches.forEach((approach, signal) => {
      const shown = this.signalFor(approach.axis);
      colors.forEach((color, lens) => target.setColorAt(signal * 3 + lens, color === shown ? active[color] : dim[color]));
    });
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
  }

  private updatePedestrians(dt: number): void {
    const bodyScale = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      ped.phase = (ped.phase + dt * ped.speed) % 2;
      const travel = (ped.phase <= 1 ? ped.phase : 2 - ped.phase) * 2 - 1;
      const bob = Math.abs(Math.sin(ped.phase * Math.PI * 8)) * 0.06;
      const x = ped.x + (ped.axis === 'x' ? travel * ped.span : 0);
      const z = ped.z + (ped.axis === 'z' ? travel * ped.span : 0);
      const forward = ped.phase <= 1 ? 1 : -1;
      const yaw = ped.axis === 'x'
        ? (forward > 0 ? Math.PI / 2 : -Math.PI / 2)
        : (forward > 0 ? 0 : Math.PI);
      this.q.setFromEuler(this.e.set(0, yaw, 0));
      this.v.set(x, bob, z);
      this.m.compose(this.v, this.q, bodyScale);
      if (this.pedestrianModelsReady) {
        this.pedestrianMeshes[ped.variant].setMatrixAt(ped.slot, this.m);
      } else {
        this.pedestrianFallback.setMatrixAt(i, this.m);
      }
    }
    if (this.pedestrianModelsReady) {
      for (const mesh of this.pedestrianMeshes) mesh.instanceMatrix.needsUpdate = true;
    } else {
      this.pedestrianFallback.instanceMatrix.needsUpdate = true;
      if (this.pedestrianFallback.instanceColor) this.pedestrianFallback.instanceColor.needsUpdate = true;
    }
  }

  private async loadPedestrianModels(): Promise<void> {
    const urls = [pedPhoneWalkUrl, pedMale03Url];
    try {
      const models = await Promise.all(urls.map((url) => loadGLB(url)));
      const meshes = models.map((model, variant) => {
        const { geometry, material } = preparePedestrian(model);
        const mesh = new THREE.InstancedMesh(
          geometry,
          material,
          this.pedestrianVariantCounts[variant],
        );
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        return mesh;
      });
      this.group.remove(this.pedestrianFallback);
      this.pedestrianFallback.geometry.dispose();
      const fallbackMat = this.pedestrianFallback.material;
      if (Array.isArray(fallbackMat)) fallbackMat.forEach((mat) => mat.dispose());
      else fallbackMat.dispose();
      this.pedestrianMeshes = meshes;
      this.group.add(...meshes);
      this.pedestrianModelsReady = true;
      this.updatePedestrians(0);
    } catch (error) {
      console.warn('[Traffic3D] pedestrian models unavailable; keeping fallback', error);
    }
  }

  private async loadTrafficModels(): Promise<void> {
    try {
      const pack = await loadGLB(trafficPackUrl);
      this.trafficModelStatus = 'loaded';
      pack.updateMatrixWorld(true);
      const available: THREE.Mesh[] = [];
      pack.traverse((object) => { if ((object as THREE.Mesh).isMesh) available.push(object as THREE.Mesh); });
      const patterns = [
        /Box_PBA/i,
        /Toyota Alphard/i,
        /Isuzu Trooper/i,
        /Honda Civic Civillian/i,
      ];
      const sources = patterns.map((pattern, index) => {
        const found = available.find((mesh) => pattern.test(mesh.name)) ?? available[index];
        if (!found) throw new Error(`Traffic pack variant missing: ${pattern.source}; available=${available.map((mesh) => mesh.name).join(',')}`);
        return found;
      });
      const meshes = sources.map((source) => {
        const prepared = prepareTrafficAsset(source, Traffic.poolSize);
        prepared.frustumCulled = false;
        return prepared;
      });
      this.trafficModelStatus = 'prepared';
      this.trafficModelMeshes = meshes;
      this.trafficModelsReady = true;
      this.group.remove(this.bodies, this.cabins);
      this.group.add(...meshes);
      this.hideAll();
      this.trafficModelStatus = 'ready';
    } catch (error) {
      this.trafficModelStatus = `error: ${String(error)}`;
      console.warn('[Traffic3D] supplied traffic pack unavailable; keeping procedural cars', error);
    }
  }

  private hideTrafficModelSlot(index: number, variant: number): void {
    const mesh = this.trafficModelMeshes[variant];
    if (!mesh) return;
    this.m.compose(this.v.set(0, -1000, 0), this.q.identity(), this.zero);
    mesh.setMatrixAt(index, this.m);
  }

  private visibleModelCount(index: number): number {
    let count = 0;
    for (const mesh of this.trafficModelMeshes) {
      const data = mesh.instanceMatrix.array;
      const o = index * 16;
      const scaleEnergy = Math.abs(data[o]) + Math.abs(data[o + 1]) + Math.abs(data[o + 2])
        + Math.abs(data[o + 4]) + Math.abs(data[o + 5]) + Math.abs(data[o + 6])
        + Math.abs(data[o + 8]) + Math.abs(data[o + 9]) + Math.abs(data[o + 10]);
      if (scaleEnergy > 0.1) count++;
    }
    return count;
  }

  private hideAll(): void {
    this.m.compose(this.v.set(0, -1000, 0), this.q.identity(), this.zero);
    for (let i = 0; i < this.cars.length; i++) {
      this.bodies.setMatrixAt(i, this.m);
      this.cabins.setMatrixAt(i, this.m);
      this.vehicleLights.setMatrixAt(i, this.m);
      for (const mesh of this.trafficModelMeshes) mesh.setMatrixAt(i, this.m);
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.cabins.instanceMatrix.needsUpdate = true;
    this.vehicleLights.instanceMatrix.needsUpdate = true;
    for (const mesh of this.trafficModelMeshes) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Bake one named vehicle from the supplied traffic pack into a normalized instanced mesh. */
function prepareTrafficAsset(source: THREE.Mesh, count: number): THREE.InstancedMesh {
  const geometry = floatGeometry(source.geometry, source.matrixWorld);
  // The optimized pack keeps each vehicle's nose on local +Z, matching runtime traffic.
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  geometry.translate(-center.x, -box.min.y, -center.z);
  // Match the prepared player car's exact width/height/length envelope. This
  // intentionally normalizes source-model proportions so traffic never reads as
  // toy-sized or oversized beside the Murphy hero.
  geometry.scale(
    World.car.w / Math.max(size.x, 0.001),
    World.car.h / Math.max(size.y, 0.001),
    World.car.l / Math.max(size.z, 0.001),
  );
  geometry.computeBoundingSphere();

  const sourceMaterial = Array.isArray(source.material) ? source.material[0] : source.material;
  const material = sourceMaterial.clone() as THREE.MeshStandardMaterial;
  if (material.isMeshStandardMaterial) {
    material.roughness = Math.max(material.roughness, 0.62);
    material.metalness = Math.min(material.metalness, 0.18);
    material.envMapIntensity = 0.35;
  }
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** Bake an optimized GLB hierarchy into one grounded, two-metre-tall mesh. */
function preparePedestrian(model: THREE.Group): { geometry: THREE.BufferGeometry; material: THREE.Material } {
  model.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  let sourceMaterial: THREE.Material | null = null;
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    parts.push(floatGeometry(mesh.geometry, mesh.matrixWorld));
    if (!sourceMaterial) {
      sourceMaterial = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone();
    }
  });
  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (!geometry || !sourceMaterial) throw new Error('Pedestrian GLB contained no renderable mesh');
  if (parts.length > 1) parts.forEach((part) => part.dispose());

  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  const scale = 2.05 / Math.max(size.y, 0.001);
  geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingSphere();

  const material = sourceMaterial as THREE.MeshStandardMaterial;
  if (material.isMeshStandardMaterial) {
    material.roughness = Math.max(material.roughness, 0.76);
    material.metalness = Math.min(material.metalness, 0.05);
    material.envMapIntensity = 0.25;
  }
  return { geometry, material };
}

/** Rebuild quantized meshopt attributes as floats before applying world matrices. */
function floatGeometry(source: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
  const positions = new Float32Array(position.count * 3);
  const normals = normal ? new Float32Array(normal.count * 3) : null;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(matrix);
    positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    if (normal && normals) {
      n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
      normals[i * 3] = n.x; normals[i * 3 + 1] = n.y; normals[i * 3 + 2] = n.z;
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const uv = source.getAttribute('uv');
  if (uv) geometry.setAttribute('uv', uv.clone());
  if (source.index) geometry.setIndex(source.index.clone());
  return geometry;
}

function coloredBox(color: number): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(1.25, 0.16, 0.08);
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
