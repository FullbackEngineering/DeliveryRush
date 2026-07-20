import Phaser from 'phaser';
import { Palette, hex } from '@/core/Palette';

/**
 * Game "juice" helpers bound to a scene: particle bursts, confetti, floating
 * reward text, screen shake and flashes. Kept in one place so every system can
 * trigger consistent feedback.
 */
export class Effects {
  constructor(private scene: Phaser.Scene) {}

  /** Radial particle burst (impacts, pickups). */
  burst(x: number, y: number, color: number, count = 14, speed = 240): void {
    const p = this.scene.add.particles(x, y, 'dot', {
      lifespan: 500,
      speed: { min: 60, max: speed },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      blendMode: 'ADD',
      emitting: false,
    });
    p.setDepth(80);
    p.explode(count);
    this.scene.time.delayedCall(600, () => p.destroy());
  }

  /** Celebratory confetti (successful delivery). */
  confetti(x: number, y: number): void {
    const p = this.scene.add.particles(x, y, 'spark', {
      lifespan: 1000,
      speedY: { min: -420, max: -160 },
      speedX: { min: -220, max: 220 },
      gravityY: 700,
      scale: { start: 1.1, end: 0.3 },
      rotate: { min: 0, max: 360 },
      tint: [Palette.green, Palette.gold, Palette.blue, Palette.orange, Palette.red, Palette.purple],
      emitting: false,
    });
    p.setDepth(85);
    p.explode(28);
    this.scene.time.delayedCall(1100, () => p.destroy());
  }

  /** Floating reward / combo text that rises and fades. */
  floatText(
    x: number,
    y: number,
    text: string,
    color: number = Palette.gold,
    size = 40,
  ): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: `${size}px`,
        color: hex(color),
      })
      .setOrigin(0.5)
      .setDepth(92)
      .setStroke('#0b1220', 6);
    this.scene.tweens.add({
      targets: t,
      y: y - 80,
      scale: { from: 0.5, to: 1.15 },
      alpha: { from: 1, to: 0 },
      duration: 950,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }

  shake(intensity = 0.008, duration = 220): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(color: number = Palette.white, duration = 160): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this.scene.cameras.main.flash(duration, r, g, b);
  }
}
