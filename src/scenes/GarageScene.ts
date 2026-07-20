import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';
import { Palette, hex } from '@/core/Palette';
import { Button, makePanel, makePill } from '@/ui/UiKit';
import { Profile } from '@/managers/ProfileStore';
import { VEHICLES, VEHICLE_MAP, statsAtLevel, upgradeCost } from '@/data/vehicles';
import { formatNumber } from '@/utils/MathUtils';
import { sfx } from '@/audio/AudioManager';

/** Garage: browse, select and upgrade vehicles. Reads/writes the profile. */
export class GarageScene extends Phaser.Scene {
  private index = 0;
  private coinsPill!: Phaser.GameObjects.Text;
  private card!: Phaser.GameObjects.Container;

  constructor() {
    super(Scenes.Garage);
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, Palette.bg);
    this.add.text(width / 2, 70, 'GARAJ', { fontFamily: 'Arial Black, sans-serif', fontSize: '52px', color: hex(Palette.text) }).setOrigin(0.5);
    this.coinsPill = makePill(this, width - 130, 60, 'coin', formatNumber(Profile.get().coins)).text;

    this.index = Math.max(0, VEHICLES.findIndex((v) => v.id === Profile.get().selectedVehicle));
    this.renderCard();

    new Button(this, 90, height * 0.42, 90, 120, '‹', { color: Palette.panelHi, fontSize: 56, onClick: () => this.cycle(-1) });
    new Button(this, width - 90, height * 0.42, 90, 120, '›', { color: Palette.panelHi, fontSize: 56, onClick: () => this.cycle(1) });
    new Button(this, width / 2, height - 90, 460, 96, 'GERİ', { color: Palette.blue, fontSize: 34, icon: '⬅', onClick: () => this.scene.start(Scenes.MainMenu) });
  }

  private cycle(dir: number): void {
    this.index = (this.index + dir + VEHICLES.length) % VEHICLES.length;
    this.renderCard();
  }

  private renderCard(): void {
    this.card?.destroy();
    const { width, height } = this.scale;
    const def = VEHICLES[this.index];
    const owned = Profile.get().ownedVehicles.includes(def.id);
    const level = Profile.vehicleLevel(def.id);
    const stats = statsAtLevel(def, level);
    const c = this.add.container(0, 0);

    // Everything created here is parented to `c` so re-rendering (cycle/upgrade/
    // select) fully replaces the card instead of stacking new panels + buttons.
    c.add(makePanel(this, width / 2, height * 0.44, 560, 520, { radius: 28 }));
    c.add(this.add.image(width / 2, height * 0.3, `car_${def.id}`).setScale(2.4));
    c.add(this.add.text(width / 2, height * 0.42, def.name, { fontFamily: 'Arial Black, sans-serif', fontSize: '38px', color: hex(Palette.text) }).setOrigin(0.5));
    c.add(this.add.text(width / 2, height * 0.46, owned ? `Seviye ${level} / ${def.maxLevel}` : 'KİLİTLİ', { fontFamily: 'Arial', fontSize: '24px', color: hex(owned ? Palette.green : Palette.textDim) }).setOrigin(0.5));

    const bars: Array<[string, number, number]> = [
      ['HIZ', stats.speed, 420],
      ['İVME', stats.acceleration, 900],
      ['KONTROL', stats.handling * 100, 100],
    ];
    bars.forEach(([label, val, max], i) => {
      const y = height * 0.52 + i * 46;
      c.add(this.add.text(width / 2 - 210, y, label, { fontFamily: 'Arial', fontSize: '22px', color: hex(Palette.textDim) }).setOrigin(0, 0.5));
      const g = this.add.graphics();
      g.fillStyle(Palette.panelHi, 1);
      g.fillRoundedRect(width / 2 - 40, y - 8, 240, 16, 8);
      g.fillStyle(Palette.green, 1);
      g.fillRoundedRect(width / 2 - 40, y - 8, Math.max(6, 240 * Phaser.Math.Clamp(val / max, 0, 1)), 16, 8);
      c.add(g);
    });

    // Action button
    if (!owned) {
      const canBuy = def.unlockCost >= 0;
      c.add(new Button(this, width / 2, height * 0.7, 420, 90,
        canBuy ? `AÇ  •  ${formatNumber(def.unlockCost)}` : 'PREMIUM',
        { color: canBuy ? Palette.orange : Palette.panelHi, fontSize: 30, icon: '🔓',
          onClick: () => { if (Profile.unlockVehicle(def.id)) { sfx('levelup'); this.refresh(); } else this.flash('Yetersiz coin'); } }));
    } else if (level < def.maxLevel) {
      const cost = upgradeCost(def, level);
      c.add(new Button(this, width / 2, height * 0.7, 420, 90, `YÜKSELT  •  ${formatNumber(cost)}`,
        { color: Palette.green, fontSize: 30, icon: '⬆',
          onClick: () => { if (Profile.upgradeVehicle(def.id)) { sfx('levelup'); this.refresh(); } else this.flash('Yetersiz coin'); } }));
    } else {
      c.add(new Button(this, width / 2, height * 0.7, 420, 90, 'MAX SEVİYE', { color: Palette.panelHi, fontSize: 30, onClick: () => {} }));
    }

    // Select button
    if (owned) {
      const selected = Profile.get().selectedVehicle === def.id;
      c.add(new Button(this, width / 2, height * 0.79, 420, 84, selected ? 'SEÇİLİ ✓' : 'SEÇ',
        { color: selected ? Palette.panelHi : Palette.blue, fontSize: 30,
          onClick: () => { Profile.selectVehicle(def.id); sfx('ui_click'); this.refresh(); } }));
    }

    this.card = c;
  }

  private refresh(): void {
    this.coinsPill.setText(formatNumber(Profile.get().coins));
    this.renderCard();
  }

  private flash(msg: string): void {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height * 0.63, msg, { fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: hex(Palette.red) }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, alpha: 0, delay: 800, duration: 400, onComplete: () => t.destroy() });
  }
}
