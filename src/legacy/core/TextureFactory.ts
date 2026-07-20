import Phaser from 'phaser';
import { Palette, mix } from '@/core/Palette';

/**
 * Generates every runtime texture procedurally with Phaser Graphics. The game
 * ships zero image assets — cars, markers, coins, particles and UI glyphs are
 * all drawn here at boot. Keeps the build tiny and lets themes recolor freely.
 */
export class TextureFactory {
  constructor(private scene: Phaser.Scene) {}

  private g(): Phaser.GameObjects.Graphics {
    return this.scene.add.graphics();
  }

  private bake(g: Phaser.GameObjects.Graphics, key: string, w: number, h: number): void {
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  /** Top-down car, nose pointing "up" (north). Tintable-free: colors baked in. */
  car(key: string, body: number, accent: number, w = 46, h = 82): void {
    const g = this.g();
    const cx = w / 2;
    // shadow
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(4, 8, w - 8, h - 8, 12);
    // wheels
    g.fillStyle(0x0d0f14, 1);
    g.fillRoundedRect(1, h * 0.2, 7, h * 0.22, 3);
    g.fillRoundedRect(w - 8, h * 0.2, 7, h * 0.22, 3);
    g.fillRoundedRect(1, h * 0.62, 7, h * 0.22, 3);
    g.fillRoundedRect(w - 8, h * 0.62, 7, h * 0.22, 3);
    // body
    g.fillStyle(body, 1);
    g.fillRoundedRect(5, 3, w - 10, h - 8, 14);
    // body top highlight
    g.fillStyle(mix(body, Palette.white, 0.22), 1);
    g.fillRoundedRect(9, 6, w - 18, h * 0.4, 10);
    // roof / cabin
    g.fillStyle(mix(body, Palette.black, 0.35), 1);
    g.fillRoundedRect(11, h * 0.36, w - 22, h * 0.32, 8);
    // windshield
    g.fillStyle(0x9fd8ff, 0.9);
    g.fillRoundedRect(12, h * 0.24, w - 24, h * 0.12, 5);
    // accent stripe
    g.fillStyle(accent, 1);
    g.fillRoundedRect(cx - 3, 6, 6, h - 14, 3);
    // headlights
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(12, 8, 3);
    g.fillCircle(w - 12, 8, 3);
    // taillights
    g.fillStyle(Palette.red, 1);
    g.fillCircle(12, h - 8, 3);
    g.fillCircle(w - 12, h - 8, 3);
    this.bake(g, key, w, h);
  }

  /** Teardrop map pin (white, tinted at use site). */
  pin(key: string, size = 72): void {
    const g = this.g();
    const cx = size / 2;
    const r = size * 0.34;
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(cx, size - 6, r * 1.4, r * 0.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, r + 4, r);
    g.fillTriangle(cx - r * 0.7, r + 10, cx + r * 0.7, r + 10, cx, size - 6);
    g.fillStyle(0x000000, 0.001);
    g.fillRect(0, 0, size, size);
    // inner hole
    g.fillStyle(0x121826, 1);
    g.fillCircle(cx, r + 4, r * 0.52);
    this.bake(g, key, size, size);
  }

  /** Soft glowing ring used for pickup/dropoff radius. */
  ring(key: string, size = 220): void {
    const g = this.g();
    const cx = size / 2;
    for (let i = 6; i >= 0; i--) {
      const rr = (size / 2) * (0.55 + i * 0.06);
      g.lineStyle(6, 0xffffff, 0.04 + i * 0.015);
      g.strokeCircle(cx, cx, rr);
    }
    g.lineStyle(6, 0xffffff, 0.9);
    g.strokeCircle(cx, cx, size * 0.4);
    this.bake(g, key, size, size);
  }

  /** Navigation chevron arrow (white). */
  arrow(key: string, w = 80, h = 92): void {
    const g = this.g();
    g.fillStyle(0x000000, 0.2);
    g.fillTriangle(w / 2, 6, w - 4, h * 0.62, 4, h * 0.62);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(w / 2, 2, w - 6, h * 0.58, 6, h * 0.58);
    g.fillRoundedRect(w * 0.3, h * 0.5, w * 0.4, h * 0.42, 6);
    this.bake(g, key, w, h);
  }

  coin(key: string, size = 44): void {
    const g = this.g();
    const cx = size / 2;
    g.fillStyle(Palette.orangeDeep, 1);
    g.fillCircle(cx, cx, cx - 2);
    g.fillStyle(Palette.gold, 1);
    g.fillCircle(cx, cx, cx - 5);
    g.fillStyle(mix(Palette.gold, Palette.white, 0.4), 1);
    g.fillCircle(cx, cx, cx - 9);
    g.lineStyle(3, Palette.orangeDeep, 1);
    g.beginPath();
    g.moveTo(cx, cx - (cx - 12));
    g.lineTo(cx, cx + (cx - 12));
    g.strokePath();
    this.bake(g, key, size, size);
  }

  gem(key: string, size = 44): void {
    const g = this.g();
    const c = size / 2;
    g.fillStyle(0x1e90ff, 1);
    g.fillTriangle(c, size - 4, 4, c * 0.9, size - 8, c * 0.9);
    g.fillStyle(0x67d0ff, 1);
    g.fillTriangle(c, 4, 4, c * 0.9, size - 4, size - 4 === 0 ? 0 : c);
    g.fillStyle(0x9fe6ff, 1);
    g.fillTriangle(c, 4, c * 0.55, c, c, c * 1.45);
    g.fillStyle(0x3ba9ff, 1);
    g.fillTriangle(c, size - 4, c * 0.6, c, c * 1.4, c);
    this.bake(g, key, size, size);
  }

  /** Small soft dot for particles (tinted at use). */
  dot(key: string, size = 24): void {
    const g = this.g();
    const c = size / 2;
    for (let i = 4; i >= 0; i--) {
      g.fillStyle(0xffffff, 0.18 + i * 0.16);
      g.fillCircle(c, c, (c * (i + 1)) / 5);
    }
    this.bake(g, key, size, size);
  }

  /** Hard square spark for confetti/impact. */
  square(key: string, size = 14): void {
    const g = this.g();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, size, size);
    this.bake(g, key, size, size);
  }

  /** Simple building block face used to fake iso depth on the static city. */
  building(key: string, top: number, side: number, w = 120, h = 120): void {
    const g = this.g();
    g.fillStyle(side, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(top, 1);
    g.fillRect(0, 0, w, h - 16);
    g.lineStyle(2, mix(top, Palette.black, 0.3), 0.6);
    for (let x = 12; x < w - 8; x += 22)
      for (let y = 10; y < h - 24; y += 20) {
        g.fillStyle(mix(top, Palette.white, 0.25), 0.5);
        g.fillRect(x, y, 10, 8);
      }
    this.bake(g, key, w, h);
  }
}
