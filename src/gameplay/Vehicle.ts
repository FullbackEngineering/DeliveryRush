import Phaser from 'phaser';
import { CityGrid, GridNode } from '@/gameplay/CityGrid';
import {
  Direction,
  DIR_VECTORS,
  Steer,
  applySteer,
  dirToAngle,
  VehicleStats,
} from '@/types';
import { Vehicle as VCfg } from '@/core/Balance';
import { damp } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';

/**
 * The player's courier vehicle. Auto-drives forward along the road grid; the
 * only control is a buffered steer (Left / Straight / Right) that commits at the
 * next intersection. Implements a forgiving "turn window" and right-hand lane
 * keeping so the car always feels planted on the road.
 */
export class Vehicle {
  readonly sprite: Phaser.GameObjects.Image;
  dir: Direction;
  private axisVertical: boolean;
  private line: number; // col if vertical, row if horizontal

  private speed = 0;
  private throttle = false; // gas pedal: hold to accelerate, release to coast
  private crashFactor = 1; // 0..1 multiplier after a crash, recovers over time
  private cooldown = 0; // crash i-frames

  private steerBuffer: Steer | null = null;
  private bufferTimer = 0;
  private lastNodeKey = '';

  /** External speed multiplier (e.g. Highway Speed card). */
  speedMultiplier = 1;

  constructor(
    private scene: Phaser.Scene,
    private grid: CityGrid,
    private stats: VehicleStats,
    start: GridNode,
    startDir: Direction,
    textureKey: string,
  ) {
    this.dir = startDir;
    this.axisVertical = startDir === Direction.North || startDir === Direction.South;
    this.line = this.axisVertical ? start.col : start.row;
    const p = grid.nodePos(start.col, start.row);
    this.sprite = scene.add.image(p.x, p.y, textureKey).setDepth(50);
    this.sprite.rotation = this.rotationFor(startDir);
    this.lastNodeKey = `${start.col},${start.row}`;
  }

  // --- Input ---------------------------------------------------------------
  setSteer(steer: Steer): void {
    this.steerBuffer = steer;
    this.bufferTimer = VCfg.inputBufferTime;
    bus.emit(GameEvent.SteerInput, steer);
  }

  /** Gas pedal. `on` = accelerate toward cruise; `off` = coast down to idle. */
  setThrottle(on: boolean): void {
    this.throttle = on;
  }

  // --- Queries -------------------------------------------------------------
  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
  }
  get currentSpeed(): number {
    return this.speed;
  }
  get cruiseSpeed(): number {
    return this.stats.speed * this.speedMultiplier;
  }
  /** 0..1 for HUD / engine audio (1 = flooring it, idle ≈ idleSpeedFactor). */
  get normalizedSpeed(): number {
    return Phaser.Math.Clamp(this.speed / this.cruiseSpeed, 0, 1);
  }
  get speedKmh(): number {
    return Math.round(this.speed * VCfg.kmhFactor);
  }
  get isInvulnerable(): boolean {
    return this.cooldown > 0;
  }

  // --- Crash ---------------------------------------------------------------
  crash(): void {
    if (this.cooldown > 0) return;
    this.crashFactor = VCfg.crashSlowdown;
    this.cooldown = 0.7;
    // small knockback opposite to travel
    const v = DIR_VECTORS[this.dir];
    this.sprite.x -= v.x * 14;
    this.sprite.y -= v.y * 14;
  }

  // --- Update --------------------------------------------------------------
  update(dtMs: number): void {
    const dt = dtMs / 1000;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.bufferTimer > 0) {
      this.bufferTimer -= dt;
      if (this.bufferTimer <= 0) this.steerBuffer = null;
    }

    // Curved speed approach toward the throttle target (scaled by crash
    // recovery). Hold gas → target = cruise; release → target = idle. Braking
    // damps faster than accelerating for arcade "brake to dodge" feel.
    this.crashFactor = Math.min(1, this.crashFactor + VCfg.crashRecover * dt);
    const maxSpeed = this.cruiseSpeed;
    const target = (this.throttle ? maxSpeed : maxSpeed * VCfg.idleSpeedFactor) * this.crashFactor;
    const lambda =
      this.speed < target
        ? this.stats.acceleration / VCfg.accelDamp
        : this.stats.braking / VCfg.brakeDamp;
    this.speed = damp(this.speed, target, lambda, dt);

    // Move along heading + lane-keep on the perpendicular axis
    const v = DIR_VECTORS[this.dir];
    const travel = this.speed * dt;
    const laneLambda = 8 + this.stats.handling * 10;
    if (this.axisVertical) {
      this.sprite.y += v.y * travel;
      this.sprite.x = damp(this.sprite.x, this.grid.laneCoord(this.line, this.dir), laneLambda, dt);
    } else {
      this.sprite.x += v.x * travel;
      this.sprite.y = damp(this.sprite.y, this.grid.laneCoord(this.line, this.dir), laneLambda, dt);
    }

    this.checkIntersection();

    // Smoothly rotate toward heading
    const targetRot = this.rotationFor(this.dir);
    this.sprite.rotation = Phaser.Math.Angle.RotateTo(
      this.sprite.rotation,
      targetRot,
      (6 + this.stats.handling * 8) * dt,
    );

    bus.emit(GameEvent.SpeedChanged, this.normalizedSpeed, this.speedKmh);
  }

  private checkIntersection(): void {
    let nodeCol: number, nodeRow: number, distToCenter: number;
    if (this.axisVertical) {
      nodeCol = this.line;
      nodeRow = Math.round(this.sprite.y / this.grid.block);
      distToCenter = Math.abs(this.sprite.y - nodeRow * this.grid.block);
    } else {
      nodeCol = Math.round(this.sprite.x / this.grid.block);
      nodeRow = this.line;
      distToCenter = Math.abs(this.sprite.x - nodeCol * this.grid.block);
    }
    if (distToCenter > VCfg.turnCommitDist) return;
    const key = `${nodeCol},${nodeRow}`;
    if (key === this.lastNodeKey) return;
    this.lastNodeKey = key;
    this.commitTurn(nodeCol, nodeRow);
  }

  private commitTurn(nodeCol: number, nodeRow: number): void {
    const desired = this.steerBuffer ?? Steer.Straight;
    const newDir = this.resolveValidDir(nodeCol, nodeRow, desired);
    this.steerBuffer = null;

    if (newDir !== this.dir) {
      // Smooth corner: change heading in place (we're already within the
      // intersection box) and let lane-keeping ease the car into the new lane
      // over the next few frames. No position snap → the turn reads as an arc
      // instead of a sideways teleport. `line` switches to the crossing grid
      // line so the new lane target is correct.
      this.dir = newDir;
      this.axisVertical = newDir === Direction.North || newDir === Direction.South;
      this.line = this.axisVertical ? nodeCol : nodeRow;
      bus.emit(GameEvent.Turned, newDir);
    }
  }

  /** Choose a valid heading, preferring the player's intent, never leaving the grid. */
  private resolveValidDir(col: number, row: number, steer: Steer): Direction {
    const wanted = applySteer(this.dir, steer);
    const candidates = [
      wanted,
      this.dir, // straight fallback
      applySteer(this.dir, Steer.Left),
      applySteer(this.dir, Steer.Right),
    ];
    for (const d of candidates) {
      if (this.canGo(col, row, d)) return d;
    }
    // last resort: reverse (only at a dead corner — shouldn't happen interior)
    return applySteer(this.dir, Steer.Left);
  }

  private canGo(col: number, row: number, dir: Direction): boolean {
    switch (dir) {
      case Direction.North:
        return row > 0;
      case Direction.South:
        return row < this.grid.rows;
      case Direction.West:
        return col > 0;
      case Direction.East:
        return col < this.grid.cols;
    }
  }

  private rotationFor(dir: Direction): number {
    // Texture nose points up (north) at rotation 0.
    return dirToAngle(dir) + Math.PI / 2;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
