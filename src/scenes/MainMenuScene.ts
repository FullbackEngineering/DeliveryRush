import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';
import { Palette, hex } from '@/core/Palette';
import { Button, makePill } from '@/ui/UiKit';
import { Profile } from '@/managers/ProfileStore';
import { formatNumber } from '@/utils/MathUtils';
import { themeForDay, THEMES } from '@/data/themes';
import { dailySeed } from '@/utils/Rng';
import { bus, GameEvent } from '@/core/EventBus';
import { sfx } from '@/audio/AudioManager';

/** Home screen: brand, currencies, city-of-the-day, and navigation. */
export class MainMenuScene extends Phaser.Scene {
  private coinsPill!: Phaser.GameObjects.Text;
  private gemsPill!: Phaser.GameObjects.Text;
  private onProfile = () => this.refreshCurrencies();

  constructor() {
    super(Scenes.MainMenu);
  }

  create(): void {
    const { width, height } = this.scale;
    this.buildBackground(width, height);

    const p = Profile.get();
    const coins = makePill(this, 130, 60, 'coin', formatNumber(p.coins));
    const gems = makePill(this, 300, 60, 'gem', formatNumber(p.gems));
    this.coinsPill = coins.text;
    this.gemsPill = gems.text;

    // Logo
    this.add.text(width / 2, height * 0.2, 'DELIVERY', { fontFamily: 'Arial Black, sans-serif', fontSize: '96px', color: hex(Palette.white) })
      .setOrigin(0.5).setStroke(hex(Palette.bgDeep), 12);
    this.add.text(width / 2, height * 0.2 + 96, 'RUSH', { fontFamily: 'Arial Black, sans-serif', fontSize: '104px', color: hex(Palette.orange) })
      .setOrigin(0.5).setStroke(hex(Palette.bgDeep), 12);
    this.add.text(width / 2, height * 0.2 + 176, 'EN HIZLI KURYE SEN OL!', { fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: hex(Palette.green) }).setOrigin(0.5);

    // City of the day
    const theme = themeForDay(dailySeed());
    const cityPanel = this.add.container(width / 2, height * 0.46);
    const cg = this.add.graphics();
    cg.fillStyle(Palette.panel, 0.9);
    cg.fillRoundedRect(-220, -40, 440, 80, 18);
    cg.lineStyle(2, theme.accent, 0.9);
    cg.strokeRoundedRect(-220, -40, 440, 80, 18);
    cityPanel.add(cg);
    cityPanel.add(this.add.text(0, -14, 'BUGÜNÜN ŞEHRİ', { fontFamily: 'Arial', fontSize: '16px', color: hex(Palette.textDim) }).setOrigin(0.5));
    cityPanel.add(this.add.text(0, 12, theme.name.toUpperCase(), { fontFamily: 'Arial Black, sans-serif', fontSize: '30px', color: hex(theme.accent) }).setOrigin(0.5));

    // Stats
    this.add.text(width / 2, height * 0.56, `En İyi Skor: ${formatNumber(p.highScore)}   •   Seviye ${p.level}`, { fontFamily: 'Arial', fontSize: '22px', color: hex(Palette.textDim) }).setOrigin(0.5);

    // Play button
    new Button(this, width / 2, height * 0.66, 420, 108, 'OYNA', {
      color: Palette.green,
      fontSize: 46,
      icon: '🚀',
      onClick: () => this.scene.start(Scenes.Game),
    });

    // Secondary nav
    const y = height * 0.78;
    new Button(this, width / 2 - 150, y, 260, 84, 'GARAJ', { color: Palette.blue, fontSize: 30, icon: '🚗', onClick: () => this.scene.start(Scenes.Garage) });
    new Button(this, width / 2 + 150, y, 260, 84, 'KARTLAR', { color: Palette.purple, fontSize: 30, icon: '🃏', onClick: () => this.toast('Kartlar yakında!') });

    const y2 = height * 0.87;
    new Button(this, width / 2 - 150, y2, 260, 80, 'MAĞAZA', { color: Palette.orange, fontSize: 28, icon: '🛒', onClick: () => this.toast('Mağaza yakında!') });
    new Button(this, width / 2 + 150, y2, 260, 80, 'LİDERLİK', { color: Palette.panelHi, fontSize: 28, icon: '🏆', onClick: () => this.toast('Liderlik yakında!') });

    bus.on(GameEvent.ProfileChanged, this.onProfile);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => bus.off(GameEvent.ProfileChanged, this.onProfile));
    sfx('ui_back');
  }

  private buildBackground(width: number, height: number): void {
    const g = this.add.graphics();
    g.fillStyle(Palette.bg, 1);
    g.fillRect(0, 0, width, height);
    // subtle theme glow strips
    THEMES.forEach((t, i) => {
      g.fillStyle(t.accent, 0.04);
      g.fillRect(0, height * (0.1 + i * 0.16), width, 60);
    });
    // decorative driving car loop
    const car = this.add.image(-80, height - 70, 'car_sport').setScale(1.1).setRotation(Math.PI / 2);
    this.tweens.add({ targets: car, x: width + 80, duration: 4200, repeat: -1, ease: 'Linear' });
  }

  private refreshCurrencies(): void {
    const p = Profile.get();
    this.coinsPill.setText(formatNumber(p.coins));
    this.gemsPill.setText(formatNumber(p.gems));
  }

  private toast(msg: string): void {
    const { width, height } = this.scale;
    const t = this.add.text(width / 2, height * 0.62, msg, { fontFamily: 'Arial Black, sans-serif', fontSize: '28px', color: hex(Palette.text), backgroundColor: 'rgba(10,15,26,0.85)', padding: { x: 20, y: 12 } }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: t, alpha: 0, y: '-=30', delay: 900, duration: 500, onComplete: () => t.destroy() });
  }
}
