import * as THREE from 'three';
import { Grid } from '@/world/Grid';
import { World, VehicleFeel } from '@/core/Balance';
import { DriveStats, Steer } from '@/types';
import { bus, GameEvent } from '@/core/EventBus';
import { FrontWheelHandles, makeFrontWheelSteerPivots } from '@/world/ModelLoader';
import { damp, clamp } from '@/utils/MathUtils';

/** Hard cap (radians) on the accel/brake pitch, independent of car stats — see
 *  `VehicleFeel.pitchGain`. Kept local (not a Balance key) per the Phase-3 spec's
 *  exact `VehicleFeel` field list. */
const PITCH_MAX = 0.04;

export class Vehicle3D {
  // Oyuncu aracını yönetir, hız, direksiyon ve çarpışma işlemlerini kontrol eder
  readonly object = new THREE.Group();
  /** Visual-only child holder: the model lives here; front-wheel steering, body
   *  lean and accel/brake pitch are applied below it. `object`
   *  itself stays a pure position + yaw transform (used for grid collision/movement)
   *  so juice never perturbs handling. */
  private readonly visual = new THREE.Group();

  x: number;
  z: number;
  yaw: number;

  private speed = 0;
  private steerInput = 0; // -1 left, 0 straight, +1 right
  private throttle = false;
  private reverse = false;
  private crashFactor = 1;
  private cooldown = 0;

  // --- Vehicle feel (visual only, see `visual` above) -----------------------
  private frontWheels: FrontWheelHandles = {};
  private prevSpeed = 0;
  private visWheelAngle = 0;
  private visLean = 0;       // damped body lean, applied to visual.rotation.z
  private visPitch = 0;      // damped accel/brake pitch, applied to visual.rotation.x

  // Per-vehicle handling (meters) — set from the selected car's `drive` stats so
  // the garage roster feels distinct. `accel` is the acceleration LIMIT: the max
  // m/s² speed can grow on the gas (a slow scooter vs a snappy hyper).
  private topSpeed: number;
  private accel: number;
  private turnRate: number;

  speedMultiplier = 1;

  // Başlatır, araba modelini ve fizik parametrelerini kurar
  constructor(
    private grid: Grid,
    bodyColor: number,
    accentColor: number,
    startX: number,
    startZ: number,
    startYaw = 0,
    modelTemplate: THREE.Object3D | null = null,
    drive: DriveStats = { topSpeed: World.cruiseSpeed, accel: World.cruiseSpeed * 0.5, turn: World.maxTurnRate },
  ) {
    this.topSpeed = drive.topSpeed;
    this.accel = drive.accel;
    this.turnRate = drive.turn;
    this.x = startX;
    this.z = startZ;
    this.yaw = startYaw;
    this.object.add(this.visual);
    // Prefer the real low-poly GLB (already scaled/oriented/grounded, nose +Z);
    // fall back to the procedural box car if the model hasn't loaded.
    if (modelTemplate) {
      const model = modelTemplate.clone(true);
      this.visual.add(model);
      this.frontWheels = makeFrontWheelSteerPivots(model);
    } else {
      this.buildMesh(bodyColor, accentColor);
    }
    this.object.position.set(this.x, 0, this.z);
    this.object.rotation.y = this.yaw;
  }

  // Direksiyon girdisini ayarlar (sol/sağ/orta)
  setSteer(steer: Steer): void {
    // +yaw rotates the car toward world +X, which is screen-LEFT for the chase
    // camera (it looks down +Z). So Left = +1, Right = -1 to match the screen.
    this.steerInput = steer === Steer.Left ? 1 : steer === Steer.Right ? -1 : 0;
  }
  // Analog direksiyon eksenini ayarlar (-1 sağ, +1 sol)
  setSteerAxis(axis: number): void {
    this.steerInput = axis < -1 ? -1 : axis > 1 ? 1 : axis;
  }
  // Gaz pedalını açır veya kapatır
  setThrottle(on: boolean): void {
    this.throttle = on;
  }
  // Geri vites komutunu ayarlar (gaz basıldığında yoksayılır)
  setReverse(on: boolean): void {
    this.reverse = on;
  }

  // Aracı başlangıç konumuna sıfırlar ve hareketi temizler
  reset(x: number, z: number, yaw = 0): void {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.speed = 0;
    this.steerInput = 0;
    this.throttle = false;
    this.reverse = false;
    this.crashFactor = 1;
    this.cooldown = 0;
    this.object.position.set(x, 0, z);
    this.object.rotation.y = yaw;
    // Snap the visual layer back to neutral so a restart doesn't carry over a
    // frozen front-wheel angle, lean or pitch from the previous run.
    this.prevSpeed = 0;
    this.visWheelAngle = 0;
    this.visLean = 0;
    this.visPitch = 0;
    this.visual.rotation.set(0, 0, 0);
    if (this.frontWheels.fl) this.frontWheels.fl.rotation.y = 0;
    if (this.frontWheels.fr) this.frontWheels.fr.rotation.y = 0;
  }

  // --- Queries -------------------------------------------------------------
  get cruiseSpeed(): number { return this.topSpeed * this.speedMultiplier; }
  get currentSpeed(): number { return this.speed; }
  get normalizedSpeed(): number { return Math.min(1, Math.max(0, this.speed / this.cruiseSpeed)); }
  get speedKmh(): number { return Math.round(Math.abs(this.speed) * World.kmhFactor); }
  get isInvulnerable(): boolean { return this.cooldown > 0; }

  // Araçı çarpışmaya yanıt vermesi yavaşlatır, hasar durumu verir
  crash(): void {
    if (this.cooldown > 0) return;
    this.speed *= 0.3;
    this.crashFactor = 0.35;
    this.cooldown = 0.7;
  }

  // Araç fizik, hız, direksiyon ve çarpışmaları her kare güncelleştirir
  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
    this.crashFactor = Math.min(1, this.crashFactor + 1.6 * dt);

    // Speed: a real acceleration-LIMIT model (linear m/s² ramp), not the old
    // near-instant exponential approach — so the car builds speed deliberately and
    // a low-`accel` car is clearly sluggish vs a high-`accel` one. speedMultiplier
    // scales both the limit and the top (the playtest harness boosts it to beeline).
    const mult = this.speedMultiplier;
    const topFwd = this.topSpeed * mult * this.crashFactor;
    const accelRate = this.accel * mult; // the acceleration limit (m/s²)
    if (this.throttle) {
      // Accelerate forward, capped at this car's top speed.
      this.speed = Math.min(topFwd, this.speed + accelRate * this.crashFactor * dt);
    } else if (this.reverse) {
      // Hold reverse: hard-brake through 0 first, then accelerate backward (capped).
      if (this.speed > 0) this.speed = Math.max(0, this.speed - World.brakeDecel * dt);
      else this.speed = Math.max(-World.reverseSpeed * mult, this.speed - World.reverseAccel * mult * dt);
    } else {
      // Coast: drag + engine braking pull speed toward 0 at a constant rate.
      if (this.speed > 0) this.speed = Math.max(0, this.speed - World.coastDecel * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + World.coastDecel * dt);
    }

    // Steering: turn rate scales with speed (can't pivot in place) and is
    // per-vehicle (better-handling cars turn a touch quicker); works the same in
    // reverse (magnitude only) so you can still steer backing up.
    const turnFactor = Math.min(1, Math.abs(this.speed) / World.turnSpeedRef);
    this.yaw += this.steerInput * this.turnRate * turnFactor * dt;

    // Move along heading (local +Z is the nose).
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const nx = this.x + fx * this.speed * dt;
    const nz = this.z + fz * this.speed * dt;
    // Building collision: keep the car on the road grid, sliding along block faces
    // instead of driving through them.
    const road = this.grid.resolveRoads(nx, nz, 0.6);
    const cx = this.grid.clampX(road.x, this.grid.roadHalf);
    const cz = this.grid.clampZ(road.z, this.grid.roadHalf);
    if (road.hit) this.speed *= 0.6; // grind against the building wall
    if (cx !== road.x || cz !== road.z) this.speed *= 0.2; // scrub at the ring road
    this.x = cx;
    this.z = cz;

    this.object.position.set(this.x, 0, this.z);
    this.object.rotation.y = this.yaw;

    this.updateVehicleFeel(dt);

    bus.emit(GameEvent.SpeedChanged, this.normalizedSpeed, this.speedKmh);
  }

  // Görsel efektleri (tekerlek, eğilme, hatırlama) güncelleştirir
  private updateVehicleFeel(dt: number): void {
    const accel = dt > 0 ? (this.speed - this.prevSpeed) / dt : 0;
    this.prevSpeed = this.speed;

    // Only the front tyres steer. There is deliberately no wheel-roll animation.
    const targetWheelAngle = this.steerInput * VehicleFeel.maxWheelAngle;
    this.visWheelAngle = damp(this.visWheelAngle, targetWheelAngle, VehicleFeel.wheelSteerLambda, dt);
    if (this.frontWheels.fl) this.frontWheels.fl.rotation.y = this.visWheelAngle;
    if (this.frontWheels.fr) this.frontWheels.fr.rotation.y = this.visWheelAngle;

    // Body lean into the turn, scaled by how fast we're actually going (no lean
    // while crawling) and damped for a natural ease-in/out.
    const speedRef = Math.max(1, this.cruiseSpeed);
    const leanFactor = Math.min(1, Math.abs(this.speed) / speedRef);
    const targetLean = -this.steerInput * leanFactor * VehicleFeel.maxLean;
    this.visLean = damp(this.visLean, targetLean, VehicleFeel.leanLambda, dt);

    // Accel squat / brake dive: nose lifts under acceleration, dips under braking.
    // Clamp the OUTPUT angle (not the raw accel) so a crash's instantaneous speed
    // drop can't punch the pitch past the "kept tiny" ceiling.
    const targetPitch = clamp(-accel * VehicleFeel.pitchGain, -PITCH_MAX, PITCH_MAX);
    this.visPitch = damp(this.visPitch, targetPitch, VehicleFeel.pitchLambda, dt);

    this.visual.rotation.z = this.visLean;
    this.visual.rotation.x = this.visPitch;
  }

  // Araba görünümü kutuları inşa ederiri (fallback/tutorial)
  private buildMesh(body: number, accent: number): void {
    const g = this.visual;
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 }),
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      g.add(mesh);
      return mesh;
    };
    box(2.1, 0.85, 4.4, body, 0, 0.72, 0);        // body
    box(1.8, 0.66, 2.2, 0x1b2330, 0, 1.32, -0.25); // cabin
    box(1.7, 0.5, 0.5, accent, 0, 1.2, 1.0);       // windshield accent
    // wheels
    this.frontWheels.fl = box(0.36, 0.62, 1.05, 0x0d0f14, -1.02, 0.42, 1.35);
    this.frontWheels.fr = box(0.36, 0.62, 1.05, 0x0d0f14, 1.02, 0.42, 1.35);
    box(0.36, 0.62, 1.05, 0x0d0f14, -1.02, 0.42, -1.35);
    box(0.36, 0.62, 1.05, 0x0d0f14, 1.02, 0.42, -1.35);
    // headlights
    box(0.4, 0.28, 0.2, 0xfff3c4, -0.6, 0.7, 2.2);
    box(0.4, 0.28, 0.2, 0xfff3c4, 0.6, 0.7, 2.2);
  }
}
