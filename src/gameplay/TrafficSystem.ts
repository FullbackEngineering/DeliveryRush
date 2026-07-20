import Phaser from 'phaser';
import { CityGrid } from '@/gameplay/CityGrid';
import { Direction, DIR_VECTORS, dirToAngle } from '@/types';
import { Rng } from '@/utils/Rng';
import { Traffic } from '@/core/Balance';
import { damp } from '@/utils/MathUtils';

interface Car {
  sprite: Phaser.GameObjects.Image;
  dir: Direction;
  vertical: boolean;
  line: number;
  speed: number;
  active: boolean;
}

/**
 * Ambient traffic. Cars drive straight along their lane (right-hand rule) and
 * recycle once they leave the area around the player — object-pooled to avoid
 * allocations. Cross-traffic at intersections and slow cars in your lane are the
 * core hazard. Returns collision / near-miss facts to the caller each frame.
 */
export class TrafficSystem {
  private cars: Car[] = [];
  private pool: Phaser.GameObjects.Image[] = [];
  private target: number = Traffic.baseCars;
  private reduction = 0; // 0..1 (Traffic Reduction card)
  private nearMissCd = 0;

  private readonly carRadius = 24;
  private readonly playerRadius = 22;
  private readonly despawn = 1500;

  constructor(
    private scene: Phaser.Scene,
    private grid: CityGrid,
    private rng: Rng,
  ) {}

  setTarget(n: number): void {
    this.target = Math.round(n * (1 - this.reduction));
  }
  setReduction(f: number): void {
    this.reduction = Phaser.Math.Clamp(f, 0, 0.9);
  }

  prime(playerPos: Phaser.Math.Vector2): void {
    for (let i = 0; i < this.target; i++) this.spawn(playerPos, true);
  }

  private obtainSprite(): Phaser.GameObjects.Image {
    const s = this.pool.pop();
    if (s) {
      s.setActive(true).setVisible(true);
      return s;
    }
    return this.scene.add.image(0, 0, `traffic_${this.rng.int(0, 5)}`).setDepth(40);
  }

  private spawn(playerPos: Phaser.Math.Vector2, anywhere = false): void {
    const vertical = this.rng.chance(0.5);
    let dir: Direction;
    let line: number;
    let x: number;
    let y: number;
    const g = this.grid;

    if (vertical) {
      const col = Phaser.Math.Clamp(Math.round(playerPos.x / g.block) + this.rng.int(-4, 4), 0, g.cols);
      dir = this.rng.chance(0.5) ? Direction.North : Direction.South;
      line = col;
      x = g.laneCoord(col, dir);
      y = anywhere
        ? this.rng.range(0, g.worldH)
        : playerPos.y + this.rng.pick([-1, 1]) * this.rng.range(500, 900);
    } else {
      const row = Phaser.Math.Clamp(Math.round(playerPos.y / g.block) + this.rng.int(-4, 4), 0, g.rows);
      dir = this.rng.chance(0.5) ? Direction.East : Direction.West;
      line = row;
      y = g.laneCoord(row, dir);
      x = anywhere
        ? this.rng.range(0, g.worldW)
        : playerPos.x + this.rng.pick([-1, 1]) * this.rng.range(500, 900);
    }

    // Don't spawn on top of the player
    if (Phaser.Math.Distance.Between(x, y, playerPos.x, playerPos.y) < 200) return;

    const sprite = this.obtainSprite();
    sprite.setTexture(`traffic_${this.rng.int(0, 5)}`);
    sprite.setPosition(x, y);
    sprite.rotation = dirToAngle(dir) + Math.PI / 2;
    this.cars.push({
      sprite,
      dir,
      vertical,
      line,
      speed: this.rng.range(Traffic.minSpeed, Traffic.maxSpeed),
      active: true,
    });
  }

  private recycle(car: Car): void {
    car.active = false;
    car.sprite.setActive(false).setVisible(false);
    this.pool.push(car.sprite);
  }

  /** @returns collision + near-miss flags for this frame. */
  update(dtMs: number, playerPos: Phaser.Math.Vector2, playerInvuln: boolean): {
    crashed: boolean;
    nearMiss: boolean;
  } {
    const dt = dtMs / 1000;
    if (this.nearMissCd > 0) this.nearMissCd -= dt;
    let crashed = false;
    let nearMiss = false;
    const g = this.grid;
    const collideSq = (this.carRadius + this.playerRadius) ** 2;
    const nearSq = 62 * 62;

    for (const car of this.cars) {
      if (!car.active) continue;
      const v = DIR_VECTORS[car.dir];
      car.sprite.x += v.x * car.speed * dt;
      car.sprite.y += v.y * car.speed * dt;
      // lane keep
      if (car.vertical) car.sprite.x = damp(car.sprite.x, g.laneCoord(car.line, car.dir), 12, dt);
      else car.sprite.y = damp(car.sprite.y, g.laneCoord(car.line, car.dir), 12, dt);

      const dSq = Phaser.Math.Distance.Squared(car.sprite.x, car.sprite.y, playerPos.x, playerPos.y);
      if (dSq < collideSq) {
        if (!playerInvuln) crashed = true;
      } else if (dSq < nearSq && this.nearMissCd <= 0) {
        nearMiss = true;
        this.nearMissCd = 0.6;
      }

      // recycle when far from player or out of world
      if (
        Phaser.Math.Distance.Between(car.sprite.x, car.sprite.y, playerPos.x, playerPos.y) > this.despawn ||
        car.sprite.x < -g.block ||
        car.sprite.x > g.worldW + g.block ||
        car.sprite.y < -g.block ||
        car.sprite.y > g.worldH + g.block
      ) {
        this.recycle(car);
      }
    }

    // compact active list
    this.cars = this.cars.filter((c) => c.active);

    // maintain density
    let guard = 6;
    while (this.cars.length < this.target && guard-- > 0) this.spawn(playerPos, false);

    return { crashed, nearMiss };
  }

  clear(): void {
    for (const car of this.cars) car.sprite.destroy();
    for (const s of this.pool) s.destroy();
    this.cars = [];
    this.pool = [];
  }
}
