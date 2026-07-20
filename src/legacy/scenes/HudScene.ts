import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';
import { Palette, hex, mix } from '@/core/Palette';
import { formatNumber, formatTime } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';
import { Order } from '@/types';
import { ControlPad } from '@/ui/ControlPad';
import { makePanel } from '@/ui/UiKit';
import { sfx } from '@/audio/AudioManager';

/**
 * Screen-fixed overlay drawn in its own scene (independent camera). Purely
 * reactive: it subscribes to gameplay events and reflects them. Holds the
 * control pad (the only input surface).
 */
export class HudScene extends Phaser.Scene {
  private pad!: ControlPad;

  private timerText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Graphics;
  private timerBarW = 220;
  private coinsText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  private orderCard!: Phaser.GameObjects.Container;
  private orderGlyph!: Phaser.GameObjects.Text;
  private orderTitle!: Phaser.GameObjects.Text;
  private orderReward!: Phaser.GameObjects.Text;
  private orderBar!: Phaser.GameObjects.Graphics;
  private orderVip!: Phaser.GameObjects.Text;

  private comboText!: Phaser.GameObjects.Text;
  private speedGfx!: Phaser.GameObjects.Graphics;
  private speedText!: Phaser.GameObjects.Text;

  private handlers: Array<[string, (...a: any[]) => void]> = [];

  constructor() {
    super({ key: Scenes.HUD, active: false });
  }

  create(): void {
    const { width } = this.scale;
    this.buildTopBar(width);
    this.buildOrderCard();
    this.buildCombo(width);
    this.buildSpeedometer(width);
    this.pad = new ControlPad(this);

    this.on2(GameEvent.RunTimer, (s: number, f: number) => this.onTimer(s, f));
    this.on2(GameEvent.RunCoins, (c: number) => this.coinsText.setText(formatNumber(c)));
    this.on2(GameEvent.RunScore, (s: number) => this.scoreText.setText(formatNumber(s)));
    this.on2(GameEvent.ComboChanged, (streak: number, mult: number) => this.onCombo(streak, mult));
    this.on2(GameEvent.OrderSpawned, (o: Order) => this.onOrder(o));
    this.on2(GameEvent.OrderPickedUp, () => this.onPicked());
    this.on2(GameEvent.OrderTimer, (f: number) => this.onOrderTimer(f));
    this.on2(GameEvent.SpeedChanged, (n: number, kmh: number) => this.onSpeed(n, kmh));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private on2(evt: string, fn: (...a: any[]) => void): void {
    bus.on(evt, fn);
    this.handlers.push([evt, fn]);
  }

  // --- Top bar ------------------------------------------------------------
  private buildTopBar(width: number): void {
    // Pause button
    const pause = this.add.container(58, 64);
    const pg = this.add.graphics();
    pg.fillStyle(Palette.panel, 0.92);
    pg.fillRoundedRect(-32, -32, 64, 64, 16);
    pg.lineStyle(2, Palette.panelLine, 1);
    pg.strokeRoundedRect(-32, -32, 64, 64, 16);
    const pi = this.add.text(0, 0, '❚❚', { fontFamily: 'Arial', fontSize: '26px', color: hex(Palette.text) }).setOrigin(0.5);
    pause.add([pg, pi]);
    pause.setSize(64, 64).setInteractive(new Phaser.Geom.Rectangle(-32, -32, 64, 64), Phaser.Geom.Rectangle.Contains);
    pause.on('pointerdown', () => { sfx('ui_click'); bus.emit(GameEvent.Pause); });

    // Timer capsule (center)
    makePanel(this, width / 2, 66, 250, 78, { radius: 24 });
    this.timerText = this.add
      .text(width / 2, 52, '0:45', { fontFamily: 'Arial Black, sans-serif', fontSize: '40px', color: hex(Palette.text) })
      .setOrigin(0.5);
    this.timerBar = this.add.graphics();
    this.scoreText = this.add
      .text(width / 2, 96, '0', { fontFamily: 'Arial', fontSize: '18px', color: hex(Palette.textDim) })
      .setOrigin(0.5);

    // Coins pill (right)
    const cx = width - 150;
    const cg = this.add.graphics();
    cg.fillStyle(Palette.panel, 0.92);
    cg.fillRoundedRect(cx - 12, 40, 152, 52, 26);
    cg.lineStyle(2, Palette.panelLine, 1);
    cg.strokeRoundedRect(cx - 12, 40, 152, 52, 26);
    this.add.image(cx + 14, 66, 'coin').setScale(0.62);
    this.coinsText = this.add
      .text(cx + 36, 66, '0', { fontFamily: 'Arial Black, sans-serif', fontSize: '28px', color: hex(Palette.gold) })
      .setOrigin(0, 0.5);
  }

  private onTimer(seconds: number, frac: number): void {
    this.timerText.setText(formatTime(seconds));
    const low = frac < 0.28;
    this.timerText.setColor(low ? hex(Palette.red) : hex(Palette.text));
    const g = this.timerBar;
    g.clear();
    const x = this.scale.width / 2 - this.timerBarW / 2;
    const y = 82;
    g.fillStyle(Palette.panelHi, 1);
    g.fillRoundedRect(x, y, this.timerBarW, 8, 4);
    g.fillStyle(low ? Palette.red : Palette.green, 1);
    g.fillRoundedRect(x, y, Math.max(4, this.timerBarW * frac), 8, 4);
  }

  // --- Order card ---------------------------------------------------------
  private buildOrderCard(): void {
    const x = 150;
    const y = 210;
    this.orderCard = this.add.container(x, y);
    const panel = this.add.graphics();
    panel.fillStyle(Palette.panel, 0.94);
    panel.fillRoundedRect(-130, -70, 260, 150, 20);
    panel.lineStyle(2, Palette.panelLine, 1);
    panel.strokeRoundedRect(-130, -70, 260, 150, 20);
    const label = this.add.text(-112, -58, 'ORDER', { fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: hex(Palette.textDim) });
    this.orderGlyph = this.add.text(-88, 6, '🍕', { fontSize: '52px' }).setOrigin(0.5);
    this.orderTitle = this.add.text(-48, -18, 'Pizza', { fontFamily: 'Arial Black, sans-serif', fontSize: '26px', color: hex(Palette.text) });
    this.orderReward = this.add.text(-48, 14, '+150', { fontFamily: 'Arial Black, sans-serif', fontSize: '24px', color: hex(Palette.gold) });
    this.orderVip = this.add.text(50, -58, 'URGENT', { fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: hex(Palette.red) }).setVisible(false);
    this.orderBar = this.add.graphics();
    this.orderCard.add([panel, label, this.orderGlyph, this.orderTitle, this.orderReward, this.orderVip, this.orderBar]);
    this.orderCard.setVisible(false);
  }

  private onOrder(o: Order): void {
    this.orderCard.setVisible(true);
    this.orderGlyph.setText(o.icon);
    this.orderTitle.setText(o.pickedUp ? 'Deliver!' : o.kind);
    // Reset from the green "Deliver!" state of the previous order.
    this.orderTitle.setColor(hex(o.pickedUp ? Palette.green : Palette.text));
    this.orderReward.setText('+' + formatNumber(o.baseReward));
    this.orderVip.setVisible(o.vip);
    this.orderCard.setScale(1.15);
    this.tweens.add({ targets: this.orderCard, scale: 1, duration: 250, ease: 'Back.out' });
  }

  private onPicked(): void {
    this.orderTitle.setText('Deliver!');
    this.orderTitle.setColor(hex(Palette.green));
  }

  private onOrderTimer(frac: number): void {
    const g = this.orderBar;
    g.clear();
    g.fillStyle(Palette.panelHi, 1);
    g.fillRoundedRect(-112, 46, 224, 10, 5);
    const col = frac < 0.3 ? Palette.red : frac < 0.6 ? Palette.orange : Palette.green;
    g.fillStyle(col, 1);
    g.fillRoundedRect(-112, 46, Math.max(4, 224 * frac), 10, 5);
    if (!this.orderCard.visible) this.orderCard.setVisible(true);
  }

  // --- Combo --------------------------------------------------------------
  private buildCombo(width: number): void {
    this.comboText = this.add
      .text(width / 2, 320, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '54px', color: hex(Palette.green) })
      .setOrigin(0.5)
      .setStroke(hex(Palette.bgDeep), 8)
      .setAlpha(0);
  }

  private onCombo(streak: number, mult: number): void {
    if (streak >= 2) {
      this.comboText.setText(`x${mult}`);
      this.comboText.setAlpha(1).setScale(1.5);
      this.tweens.killTweensOf(this.comboText);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 300, ease: 'Back.out' });
    } else {
      this.tweens.add({ targets: this.comboText, alpha: 0, duration: 250 });
    }
  }

  // --- Speedometer --------------------------------------------------------
  private buildSpeedometer(width: number): void {
    const cx = width - 110;
    const cy = this.scale.height - 360;
    this.speedGfx = this.add.graphics();
    this.speedGfx.setData('cx', cx).setData('cy', cy);
    this.speedText = this.add
      .text(cx, cy - 4, '0', { fontFamily: 'Arial Black, sans-serif', fontSize: '34px', color: hex(Palette.text) })
      .setOrigin(0.5);
    this.add.text(cx, cy + 26, 'KM/H', { fontFamily: 'Arial', fontSize: '15px', color: hex(Palette.textDim) }).setOrigin(0.5);
    this.drawSpeed(0);
  }

  private onSpeed(norm: number, kmh: number): void {
    this.speedText.setText(String(kmh));
    this.drawSpeed(norm);
  }

  private drawSpeed(norm: number): void {
    const g = this.speedGfx;
    const cx = g.getData('cx') as number;
    const cy = g.getData('cy') as number;
    const r = 62;
    const start = Phaser.Math.DegToRad(135);
    const end = Phaser.Math.DegToRad(135 + 270);
    g.clear();
    g.fillStyle(Palette.panel, 0.9);
    g.fillCircle(cx, cy, r + 10);
    g.lineStyle(12, Palette.panelHi, 1);
    g.beginPath();
    g.arc(cx, cy, r, start, end, false);
    g.strokePath();
    const val = Phaser.Math.DegToRad(135 + 270 * Phaser.Math.Clamp(norm, 0, 1));
    const col = norm > 0.8 ? Palette.red : norm > 0.5 ? Palette.orange : Palette.green;
    g.lineStyle(12, col, 1);
    g.beginPath();
    g.arc(cx, cy, r, start, val, false);
    g.strokePath();
    void mix;
  }

  private teardown(): void {
    for (const [evt, fn] of this.handlers) bus.off(evt, fn);
    this.handlers = [];
    this.pad?.destroy();
  }
}
