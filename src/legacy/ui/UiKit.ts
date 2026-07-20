import Phaser from 'phaser';
import { Palette, mix, hex } from '@/core/Palette';
import { sfx } from '@/audio/AudioManager';
import { haptic } from '@/input/Haptics';

/** Reusable UI building blocks with a consistent premium look + press feedback. */

export interface ButtonOpts {
  color?: number;
  textColor?: number;
  fontSize?: number;
  icon?: string; // emoji prefix
  radius?: number;
  onClick?: () => void;
}

export function drawRoundRectFilled(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: number,
  alpha = 1,
): void {
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x, y, w, h, r);
}

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { color?: number; border?: number; radius?: number; alpha?: number } = {},
): Phaser.GameObjects.Graphics {
  const { color = Palette.panel, border = Palette.panelLine, radius = 22, alpha = 1 } = opts;
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(2, border, 0.8);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private radius: number;
  private baseColor: number;
  private enabled = true;
  private onClick?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string, opts: ButtonOpts = {}) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.radius = opts.radius ?? 16;
    this.baseColor = opts.color ?? Palette.green;
    this.onClick = opts.onClick;

    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.paint(this.baseColor);

    const content = (opts.icon ? opts.icon + '  ' : '') + text;
    this.label = scene.add
      .text(0, 0, content, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: `${opts.fontSize ?? 30}px`,
        color: hex(opts.textColor ?? Palette.white),
      })
      .setOrigin(0.5);
    this.add(this.label);

    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', this.press, this);
    this.on('pointerup', this.release, this);
    this.on('pointerout', this.cancel, this);

    scene.add.existing(this);
  }

  private paint(color: number, pressed = false): void {
    const g = this.bg;
    g.clear();
    const x = -this.bw / 2;
    const y = -this.bh / 2;
    // drop shadow / 3D base
    g.fillStyle(mix(color, Palette.black, 0.45), 1);
    g.fillRoundedRect(x, y + (pressed ? 2 : 6), this.bw, this.bh, this.radius);
    // top face
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y + (pressed ? 2 : 0), this.bw, this.bh - 6, this.radius);
    // gloss
    g.fillStyle(mix(color, Palette.white, 0.25), 0.5);
    g.fillRoundedRect(x + 6, y + (pressed ? 4 : 2), this.bw - 12, (this.bh - 6) * 0.45, this.radius * 0.7);
  }

  private press(): void {
    if (!this.enabled) return;
    this.paint(this.baseColor, true);
    this.label.y = 3;
  }
  private cancel(): void {
    if (!this.enabled) return;
    this.paint(this.baseColor, false);
    this.label.y = 0;
  }
  private release(): void {
    if (!this.enabled) return;
    this.paint(this.baseColor, false);
    this.label.y = 0;
    sfx('ui_click');
    haptic('light');
    this.onClick?.();
  }

  setColor(color: number): this {
    this.baseColor = color;
    this.paint(color);
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setEnabled(v: boolean): this {
    this.enabled = v;
    this.setAlpha(v ? 1 : 0.5);
    return this;
  }
}

/** Small rounded stat/currency pill (icon + value). */
export function makePill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  icon: string,
  value: string,
  color = Palette.panel,
): { container: Phaser.GameObjects.Container; text: Phaser.GameObjects.Text } {
  const w = 150;
  const h = 54;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(color, 0.92);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(2, Palette.panelLine, 0.8);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const ic = scene.add.image(-w / 2 + 26, 0, icon).setScale(0.7);
  const text = scene.add
    .text(-w / 2 + 50, 0, value, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
      color: hex(Palette.text),
    })
    .setOrigin(0, 0.5);
  c.add([g, ic, text]);
  return { container: c, text };
}
