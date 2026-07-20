import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';
import { Design } from '@/core/Balance';
import { Palette } from '@/core/Palette';
import { TextureFactory } from '@/core/TextureFactory';
import { VEHICLES } from '@/data/vehicles';

/**
 * Generates every procedural texture once, shows a short branded loader, then
 * enters the main menu. No external asset files are loaded — all art is drawn.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(Scenes.Preload);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    // --- Brand + progress bar --------------------------------------------
    this.add
      .text(cx, height * 0.4, 'DELIVERY', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '84px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setStroke('#0b1220', 10);
    this.add
      .text(cx, height * 0.4 + 88, 'RUSH', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '92px',
        color: '#f5a524',
      })
      .setOrigin(0.5)
      .setStroke('#0b1220', 10);

    const barW = width * 0.6;
    const barX = cx - barW / 2;
    const barY = height * 0.62;
    const barBg = this.add.rectangle(cx, barY, barW, 16, Palette.panel).setStrokeStyle(2, Palette.panelLine);
    const bar = this.add.rectangle(barX, barY, 4, 10, Palette.green).setOrigin(0, 0.5);
    void barBg;

    // --- Generate textures ------------------------------------------------
    const tf = new TextureFactory(this);
    const steps: Array<() => void> = [
      () => tf.pin('pin'),
      () => tf.ring('ring'),
      () => tf.arrow('arrow'),
      () => tf.coin('coin'),
      () => tf.gem('gem'),
      () => tf.dot('dot'),
      () => tf.square('spark'),
      // Player vehicle textures (one per vehicle color for garage previews)
      () => VEHICLES.forEach((v) => tf.car(`car_${v.id}`, v.bodyColor, v.accentColor)),
      // Traffic palette
      () => {
        const colors: Array<[number, number]> = [
          [0x3b82f6, 0x8ec5ff],
          [0xef4444, 0xffb4a2],
          [0x22c55e, 0xa7f3d0],
          [0xf5a524, 0xffe08a],
          [0x94a3b8, 0xe2e8f0],
          [0x8b5cf6, 0xd8b4fe],
        ];
        colors.forEach((c, i) => tf.car(`traffic_${i}`, c[0], c[1]));
      },
      // Building faces (a few tones; recolored per theme via tint)
      () => tf.building('building', 0x3d6ea5, 0x24507a),
    ];

    let i = 0;
    this.time.addEvent({
      delay: 40,
      repeat: steps.length - 1,
      callback: () => {
        steps[i]?.();
        i++;
        const p = i / steps.length;
        bar.width = Math.max(4, barW * p);
        if (i >= steps.length) {
          this.time.delayedCall(180, () => this.scene.start(Scenes.MainMenu));
        }
      },
    });
  }
}
