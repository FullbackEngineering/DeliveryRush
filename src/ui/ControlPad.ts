import Phaser from 'phaser';
import { Steer } from '@/types';
import { Palette, mix } from '@/core/Palette';
import { bus, GameEvent } from '@/core/EventBus';
import { haptic } from '@/input/Haptics';

/**
 * The entire control scheme: three large, colorblind-distinct touch buttons.
 * Emits ControlSteer on press (buffered by the vehicle at the next intersection).
 * Colors + directional glyphs are both used so the buttons are readable without
 * relying on color alone.
 */
interface PadButton {
  g: Phaser.GameObjects.Graphics;
  glyph: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  color: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  r: number;
}

export class ControlPad {
  private buttons: PadButton[] = [];

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    const y = height - 130;
    const gap = 18;
    const sideW = 190;
    const midW = 210;
    const sideH = 150;
    const midH = 168;

    const midX = width / 2;
    const leftX = midX - midW / 2 - gap - sideW / 2;
    const rightX = midX + midW / 2 + gap + sideW / 2;

    // Sides = steer (buffered to next intersection). Center = gas pedal: hold to
    // accelerate, release to coast/brake (the primary "go" button).
    this.buttons.push(
      this.make(leftX, y, sideW, sideH, Palette.blue, '‹', () => bus.emit(GameEvent.ControlSteer, Steer.Left)),
    );
    this.buttons.push(
      this.make(midX, y - 6, midW, midH, Palette.green, '▲',
        () => bus.emit(GameEvent.ControlThrottle, true),
        () => bus.emit(GameEvent.ControlThrottle, false)),
    );
    this.buttons.push(
      this.make(rightX, y, sideW, sideH, Palette.orange, '›', () => bus.emit(GameEvent.ControlSteer, Steer.Right)),
    );
  }

  private make(
    cx: number,
    cy: number,
    w: number,
    h: number,
    color: number,
    glyph: string,
    onPress: () => void,
    onRelease?: () => void,
  ): PadButton {
    const r = 28;
    const g = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
    const glyphText = this.scene.add
      .text(cx, cy, glyph, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: glyph === '▲' ? '76px' : '92px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setScrollFactor(0);
    if (glyph !== '▲') glyphText.setY(cy - 4);

    const btn: PadButton = { g, glyph: glyphText, zone: null as unknown as Phaser.GameObjects.Zone, color, cx, cy, w, h, r };
    this.paint(btn, false);

    const zone = this.scene.add
      .zone(cx, cy, w, h)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(102);
    btn.zone = zone;

    zone.on('pointerdown', () => {
      this.paint(btn, true);
      onPress();
      haptic('light');
    });
    const releaseFn = () => {
      this.paint(btn, false);
      onRelease?.();
    };
    zone.on('pointerup', releaseFn);
    zone.on('pointerout', releaseFn);

    return btn;
  }

  private paint(btn: PadButton, pressed: boolean): void {
    const { g, cx, cy, w, h, r, color } = btn;
    g.clear();
    const x = cx - w / 2;
    const y = cy - h / 2;
    g.fillStyle(mix(color, Palette.black, 0.5), 0.9);
    g.fillRoundedRect(x, y + (pressed ? 3 : 8), w, h, r);
    g.fillStyle(pressed ? mix(color, Palette.white, 0.15) : color, pressed ? 1 : 0.95);
    g.fillRoundedRect(x, y + (pressed ? 3 : 0), w, h - 8, r);
    g.fillStyle(mix(color, Palette.white, 0.3), 0.35);
    g.fillRoundedRect(x + 8, y + (pressed ? 6 : 3), w - 16, (h - 8) * 0.4, r * 0.7);
    btn.glyph.setScale(pressed ? 0.92 : 1);
  }

  setVisible(v: boolean): void {
    for (const b of this.buttons) {
      b.g.setVisible(v);
      b.glyph.setVisible(v);
      b.zone.setActive(v);
    }
  }

  destroy(): void {
    for (const b of this.buttons) {
      b.g.destroy();
      b.glyph.destroy();
      b.zone.destroy();
    }
    this.buttons = [];
  }
}
