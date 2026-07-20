import Phaser from 'phaser';
import { CityGrid } from '@/gameplay/CityGrid';
import { Order } from '@/types';
import { Rng } from '@/utils/Rng';
import { ORDER_KINDS } from '@/data/orderKinds';
import { Scoring } from '@/core/Balance';
import { Palette, hex } from '@/core/Palette';
import { bus, GameEvent } from '@/core/EventBus';

type OrderEvent = 'none' | 'pickup' | 'deliver' | 'expire';

/** A world beacon: pulsing ground ring + bobbing pin + emoji glyph. */
class Marker {
  ring: Phaser.GameObjects.Image;
  pin: Phaser.GameObjects.Image;
  glyph: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, color: number, emoji: string) {
    this.ring = scene.add.image(0, 0, 'ring').setTint(color).setDepth(28).setAlpha(0.55);
    this.pin = scene.add.image(0, 0, 'pin').setTint(color).setDepth(30).setOrigin(0.5, 0.9).setScale(1.1);
    this.glyph = scene.add
      .text(0, -8, emoji, { fontSize: '40px' })
      .setOrigin(0.5)
      .setDepth(31);
    scene.tweens.add({ targets: this.ring, scale: { from: 0.85, to: 1.35 }, alpha: { from: 0.6, to: 0.1 }, duration: 850, repeat: -1 });
    scene.tweens.add({ targets: [this.pin, this.glyph], y: '-=8', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }
  setPosition(x: number, y: number): void {
    this.ring.setPosition(x, y);
    this.pin.setPosition(x, y);
    this.glyph.setPosition(x, y - 44);
  }
  setVisible(v: boolean): void {
    this.ring.setVisible(v);
    this.pin.setVisible(v);
    this.glyph.setVisible(v);
  }
  setStyle(color: number, emoji: string): void {
    this.ring.setTint(color);
    this.pin.setTint(color);
    this.glyph.setText(emoji);
  }
  destroy(): void {
    this.ring.destroy();
    this.pin.destroy();
    this.glyph.destroy();
  }
}

/**
 * Owns the active delivery: picks a pickup→dropoff route near the player, shows
 * beacons and an on-screen navigation arrow, and reports pickup/deliver/expire
 * events. Single active order for MVP (cargo capacity 1).
 */
export class OrderSystem {
  current: Order | null = null;
  private nextId = 1;
  private timer = 0;
  private timeLimit = 20;
  private readonly radius = 76;

  private pickupMarker: Marker;
  private dropMarker: Marker;
  private arrow: Phaser.GameObjects.Image;
  private arrowLabel: Phaser.GameObjects.Text;

  constructor(
    private scene: Phaser.Scene,
    private grid: CityGrid,
    private rng: Rng,
  ) {
    this.pickupMarker = new Marker(scene, Palette.orange, '🍕');
    this.dropMarker = new Marker(scene, Palette.green, '🏠');
    this.arrow = scene.add.image(0, 0, 'arrow').setTint(Palette.green).setDepth(60).setScale(1.0).setVisible(false);
    this.arrowLabel = this.scene.add
      .text(0, 0, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(61)
      .setStroke('#0b1220', 6)
      .setVisible(false);
    this.pickupMarker.setVisible(false);
    this.dropMarker.setVisible(false);
  }

  /** Spawn a new order near the player. `vipChance`/`timeLimit` come from RunState. */
  spawn(playerPos: Phaser.Math.Vector2, vipChance: number, timeLimit: number): Order {
    const pc = Phaser.Math.Clamp(Math.round(playerPos.x / this.grid.block), 0, this.grid.cols);
    const pr = Phaser.Math.Clamp(Math.round(playerPos.y / this.grid.block), 0, this.grid.rows);
    const pickup = this.grid.nodeNear(pc, pr, 2, 5);
    const dropoff = this.grid.nodeNear(pickup.col, pickup.row, 3, 7);
    const kind = this.rng.pick(ORDER_KINDS);
    const vip = this.rng.chance(vipChance);
    const distBlocks = Math.abs(pickup.col - dropoff.col) + Math.abs(pickup.row - dropoff.row);
    const baseReward = Scoring.baseReward + distBlocks * Scoring.distanceBonus + (vip ? 60 : 0);

    this.current = {
      id: this.nextId++,
      kind: kind.label,
      icon: kind.emoji,
      baseReward,
      vip,
      pickup,
      dropoff,
      timeLimit,
      pickedUp: false,
    };
    this.timeLimit = timeLimit;
    this.timer = timeLimit;

    const pp = this.grid.nodePos(pickup.col, pickup.row);
    this.pickupMarker.setStyle(vip ? Palette.gold : kind.color, kind.emoji);
    this.pickupMarker.setPosition(pp.x, pp.y);
    this.pickupMarker.setVisible(true);
    this.dropMarker.setStyle(Palette.green, '🏠');
    this.dropMarker.setVisible(false);
    // Arrow points to the pickup first (orange), then the dropoff (green).
    this.arrow.setTint(vip ? Palette.gold : Palette.orange);
    this.arrowLabel.setColor(hex(vip ? Palette.gold : Palette.orange));

    bus.emit(GameEvent.OrderSpawned, this.current);
    return this.current;
  }

  get remainingFraction(): number {
    return this.timeLimit > 0 ? Phaser.Math.Clamp(this.timer / this.timeLimit, 0, 1) : 0;
  }
  get remainingTime(): number {
    return Math.max(0, this.timer);
  }

  targetPos(): Phaser.Math.Vector2 | null {
    if (!this.current) return null;
    const node = this.current.pickedUp ? this.current.dropoff : this.current.pickup;
    return this.grid.nodePos(node.col, node.row);
  }

  update(dtMs: number, playerPos: Phaser.Math.Vector2): OrderEvent {
    if (!this.current) {
      this.arrow.setVisible(false);
      return 'none';
    }
    const dt = dtMs / 1000;
    this.timer -= dt;
    bus.emit(GameEvent.OrderTimer, this.remainingFraction, this.remainingTime);
    if (this.timer <= 0) {
      // Clear current BEFORE emitting: the OrderExpired handler spawns the next
      // order (setting `current`), so nulling afterwards would wipe it and
      // soft-lock the run. Mirrors the deliver branch below.
      const expired = this.current;
      this.hideAll();
      this.current = null;
      bus.emit(GameEvent.OrderExpired, expired);
      return 'expire';
    }

    const target = this.targetPos()!;
    const dist = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, target.x, target.y);

    // Navigation arrow: floats around the player pointing at the target, with a
    // "blocks remaining" label so you always know which way and how far to go.
    if (dist > 130) {
      const ang = Phaser.Math.Angle.Between(playerPos.x, playerPos.y, target.x, target.y);
      const ax = playerPos.x + Math.cos(ang) * 135;
      const ay = playerPos.y + Math.sin(ang) * 135;
      this.arrow.setVisible(true).setPosition(ax, ay);
      this.arrow.rotation = ang + Math.PI / 2;
      const blocks = Math.max(1, Math.round(dist / this.grid.block));
      this.arrowLabel
        .setVisible(true)
        .setText(String(blocks))
        .setPosition(playerPos.x + Math.cos(ang) * 92, playerPos.y + Math.sin(ang) * 92);
    } else {
      this.arrow.setVisible(false);
      this.arrowLabel.setVisible(false);
    }

    if (dist < this.radius) {
      if (!this.current.pickedUp) {
        this.current.pickedUp = true;
        this.pickupMarker.setVisible(false);
        const dp = this.grid.nodePos(this.current.dropoff.col, this.current.dropoff.row);
        this.dropMarker.setPosition(dp.x, dp.y);
        this.dropMarker.setVisible(true);
        this.arrow.setTint(Palette.green);
        this.arrowLabel.setColor(hex(Palette.green));
        bus.emit(GameEvent.OrderPickedUp, this.current);
        return 'pickup';
      } else {
        const done = this.current;
        this.hideAll();
        this.current = null;
        bus.emit(GameEvent.OrderDelivered, done);
        return 'deliver';
      }
    }
    return 'none';
  }

  private hideAll(): void {
    this.pickupMarker.setVisible(false);
    this.dropMarker.setVisible(false);
    this.arrow.setVisible(false);
    this.arrowLabel.setVisible(false);
  }

  clear(): void {
    this.pickupMarker.destroy();
    this.dropMarker.destroy();
    this.arrow.destroy();
    this.arrowLabel.destroy();
    this.current = null;
  }
}
