import Phaser from 'phaser';
import { Scenes } from '@/core/SceneKeys';
import { Run, Traffic as TCfg, Camera as Cam } from '@/core/Balance';
import { Palette, hex } from '@/core/Palette';
import { lerp } from '@/utils/MathUtils';
import { Rng, dailySeed } from '@/utils/Rng';
import { themeForDay } from '@/data/themes';
import { CityGrid } from '@/gameplay/CityGrid';
import { Vehicle } from '@/gameplay/Vehicle';
import { TrafficSystem } from '@/gameplay/TrafficSystem';
import { OrderSystem } from '@/systems/OrderSystem';
import { RunState } from '@/systems/RunState';
import { Effects } from '@/effects/Effects';
import { Profile } from '@/managers/ProfileStore';
import { VEHICLE_MAP, statsAtLevel } from '@/data/vehicles';
import { CARD_MAP } from '@/data/cards';
import { bus, GameEvent } from '@/core/EventBus';
import { Direction, Order, Steer, CardEffectId } from '@/types';
import { Audio, sfx } from '@/audio/AudioManager';
import { haptic } from '@/input/Haptics';

/**
 * The gameplay orchestrator. Owns the world (grid, vehicle, traffic, orders) and
 * the run state, wires input, and turns system events into feedback. Deliberately
 * thin: heavy logic lives in the systems it composes.
 */
export class GameScene extends Phaser.Scene {
  private grid!: CityGrid;
  private vehicle!: Vehicle;
  private traffic!: TrafficSystem;
  private orders!: OrderSystem;
  private run!: RunState;
  private fx!: Effects;
  private rng!: Rng;

  private started = false;
  private paused = false;
  private ended = false;
  private countdownText?: Phaser.GameObjects.Text;

  // bound handlers (so we can detach on shutdown)
  private hSteer = (s: Steer) => this.vehicle?.setSteer(s);
  private hThrottle = (on: boolean) => this.vehicle?.setThrottle(on);
  private hDelivered = (o: Order) => this.onDelivered(o);
  private hPicked = (o: Order) => this.onPicked(o);
  private hExpired = () => this.onExpired();
  private hRunEnd = () => this.onRunEnd();
  private hPause = () => this.togglePause();

  constructor() {
    super(Scenes.Game);
  }

  create(): void {
    this.started = false;
    this.paused = false;
    this.ended = false;

    const day = dailySeed();
    const theme = themeForDay(day);
    this.rng = new Rng((day ^ (Date.now() & 0xffff)) >>> 0);
    this.cameras.main.setBackgroundColor(theme.ground);

    // World
    this.grid = new CityGrid(this, theme, this.rng);
    this.grid.render(0);

    // Player vehicle from profile
    const profile = Profile.get();
    const def = VEHICLE_MAP[profile.selectedVehicle] ?? VEHICLE_MAP['starter'];
    const stats = statsAtLevel(def, Profile.vehicleLevel(def.id));
    const startNode = this.grid.clampInterior(this.grid.randomInterior(4), 4);
    this.vehicle = new Vehicle(this, this.grid, stats, startNode, Direction.North, `car_${def.id}`);

    // Card modifiers
    const mods = this.resolveCards(profile.equippedCards);
    this.vehicle.speedMultiplier = mods.speedMultiplier;

    // Run state
    this.run = new RunState();
    this.run.coinBonus = mods.coinBonus;
    this.run.freeCrashes = mods.freeCrashes;

    // Systems
    this.fx = new Effects(this);
    this.traffic = new TrafficSystem(this, this.grid, this.rng);
    this.traffic.setReduction(mods.trafficReduction);
    this.traffic.setTarget(TCfg.baseCars);
    this.traffic.prime(this.vehicle.position);

    this.orders = new OrderSystem(this, this.grid, this.rng);

    // Camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.worldW, this.grid.worldH);
    cam.startFollow(this.vehicle.sprite, true, Cam.followLerp, Cam.followLerp);
    cam.setZoom(Cam.zoomBase);

    // Input wiring
    bus.on(GameEvent.ControlSteer, this.hSteer);
    bus.on(GameEvent.ControlThrottle, this.hThrottle);
    bus.on(GameEvent.OrderDelivered, this.hDelivered);
    bus.on(GameEvent.OrderPickedUp, this.hPicked);
    bus.on(GameEvent.OrderExpired, this.hExpired);
    bus.on(GameEvent.RunEnd, this.hRunEnd);
    bus.on(GameEvent.Pause, this.hPause);
    this.setupKeyboard();

    // HUD overlay
    this.scene.launch(Scenes.HUD);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    this.startCountdown();
  }

  // --- Card effect resolution --------------------------------------------
  private resolveCards(equipped: CardEffectId[]) {
    const mods = { speedMultiplier: 1, coinBonus: 1, trafficReduction: 0, freeCrashes: 0 };
    for (const id of equipped) {
      const def = CARD_MAP[id];
      if (!def) continue;
      const lvl = Profile.cardLevel(id);
      const v = def.value + (lvl - 1) * def.valueGrowth;
      switch (id) {
        case 'highwaySpeed':
          mods.speedMultiplier += v;
          break;
        case 'coinBonus':
          mods.coinBonus *= 1 + v;
          break;
        case 'trafficReduction':
          mods.trafficReduction = Math.max(mods.trafficReduction, v);
          break;
        case 'freeFirstCrash':
          mods.freeCrashes += Math.round(v);
          break;
        default:
          break;
      }
    }
    return mods;
  }

  // --- Countdown ----------------------------------------------------------
  private startCountdown(): void {
    const { width, height } = this.scale;
    this.countdownText = this.add
      .text(width / 2, height * 0.42, '3', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '160px',
        color: hex(Palette.white),
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120)
      .setStroke(hex(Palette.bgDeep), 12);

    const steps = ['3', '2', '1', 'GO!'];
    let i = 0;
    const tick = () => {
      const label = steps[i];
      this.countdownText!.setText(label);
      this.countdownText!.setColor(label === 'GO!' ? hex(Palette.green) : hex(Palette.white));
      this.countdownText!.setScale(1.4);
      this.tweens.add({ targets: this.countdownText, scale: 1, duration: 300, ease: 'Back.out' });
      sfx(label === 'GO!' ? 'go' : 'countdown');
      i++;
      if (i < steps.length) {
        this.time.delayedCall(Run.countdownStepMs, tick);
      } else {
        this.time.delayedCall(Run.countdownGoMs, () => {
          this.countdownText?.destroy();
          this.beginRun();
        });
      }
    };
    tick();
  }

  private beginRun(): void {
    this.started = true;
    Audio.startEngine();
    bus.emit(GameEvent.RunStart);
    bus.emit(GameEvent.RunTimer, this.run.time, this.run.time / Run.maxTime);
    this.orders.spawn(this.vehicle.position, this.run.vipChance(), this.run.orderTimeLimit());
  }

  // --- Order handlers -----------------------------------------------------
  private onPicked(_o: Order): void {
    const p = this.vehicle.position;
    sfx('pickup');
    haptic('light');
    this.fx.burst(p.x, p.y, Palette.orange, 12, 180);
    this.fx.floatText(p.x, p.y - 30, 'PICKED UP', Palette.orange, 30);
  }

  private onDelivered(order: Order): void {
    const res = this.run.onDelivered(order);
    const p = this.vehicle.position;
    this.fx.confetti(p.x, p.y - 20);
    this.fx.burst(p.x, p.y, Palette.green, 18);
    this.fx.floatText(p.x, p.y - 40, `+${res.coins}`, Palette.gold, 46);
    if (res.multiplier > 1) {
      this.fx.floatText(p.x, p.y - 100, `x${res.multiplier} COMBO`, Palette.green, 34);
      sfx('combo');
    }
    this.fx.flash(Palette.green, 110);
    this.fx.shake(0.006, 180);
    sfx('deliver');
    sfx('coin');
    haptic('success');

    // Difficulty ramp → more traffic
    const t = this.run.difficulty;
    this.traffic.setTarget(Math.round(lerp(TCfg.baseCars, TCfg.maxCars, t)));

    // Next order
    this.orders.spawn(this.vehicle.position, this.run.vipChance(), this.run.orderTimeLimit());
  }

  private onExpired(): void {
    this.run.onOrderExpired();
    const p = this.vehicle.position;
    sfx('fail');
    haptic('error');
    this.fx.floatText(p.x, p.y - 40, 'MISSED!', Palette.red, 40);
    this.fx.shake(0.008, 220);
    this.orders.spawn(this.vehicle.position, this.run.vipChance(), this.run.orderTimeLimit());
  }

  private handleCrash(): void {
    const broke = this.run.onCrash();
    this.vehicle.crash();
    const p = this.vehicle.position;
    this.fx.burst(p.x, p.y, Palette.red, 22, 300);
    this.fx.flash(Palette.red, 140);
    this.fx.shake(0.016, 260);
    sfx('crash');
    haptic('error');
    if (broke) this.fx.floatText(p.x, p.y - 50, 'COMBO LOST', Palette.red, 34);
    else this.fx.floatText(p.x, p.y - 50, 'SHIELD!', Palette.cyan, 34);
    bus.emit(GameEvent.Crash);
  }

  // --- Pause --------------------------------------------------------------
  private togglePause(): void {
    if (!this.started || this.ended) return;
    this.paused = !this.paused;
    if (this.paused) {
      Audio.stopEngine();
      this.showPauseOverlay();
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
      Audio.startEngine();
    }
  }

  private pauseOverlay?: Phaser.GameObjects.Container;
  private showPauseOverlay(): void {
    const { width, height } = this.scale;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(130);
    const dim = this.add.rectangle(width / 2, height / 2, width, height, Palette.bgDeep, 0.6);
    const label = this.add
      .text(width / 2, height / 2, 'PAUSED\nTap to resume', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '48px',
        color: hex(Palette.text),
        align: 'center',
      })
      .setOrigin(0.5);
    c.add([dim, label]);
    dim.setInteractive().on('pointerdown', () => this.togglePause());
    this.pauseOverlay = c;
  }

  private onRunEnd(): void {
    if (this.ended) return;
    this.ended = true;
    this.started = false;
    Audio.stopEngine();
    sfx('fail');
    const summary = this.run.summary();
    Profile.recordRun(summary.coins, summary.deliveries, summary.score);
    this.time.delayedCall(400, () => {
      this.scene.stop(Scenes.HUD);
      this.scene.start(Scenes.Results, summary);
    });
  }

  // --- Keyboard (desktop testing) ----------------------------------------
  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-LEFT', () => bus.emit(GameEvent.ControlSteer, Steer.Left));
    kb.on('keydown-A', () => bus.emit(GameEvent.ControlSteer, Steer.Left));
    kb.on('keydown-RIGHT', () => bus.emit(GameEvent.ControlSteer, Steer.Right));
    kb.on('keydown-D', () => bus.emit(GameEvent.ControlSteer, Steer.Right));
    // Gas pedal: hold UP / W / SPACE to accelerate, release to coast.
    const gasOn = () => bus.emit(GameEvent.ControlThrottle, true);
    const gasOff = () => bus.emit(GameEvent.ControlThrottle, false);
    kb.on('keydown-UP', gasOn);
    kb.on('keyup-UP', gasOff);
    kb.on('keydown-W', gasOn);
    kb.on('keyup-W', gasOff);
    kb.on('keydown-SPACE', gasOn);
    kb.on('keyup-SPACE', gasOff);
    kb.on('keydown-ESC', () => bus.emit(GameEvent.Pause));
    kb.on('keydown-P', () => bus.emit(GameEvent.Pause));
  }

  // --- Main loop ----------------------------------------------------------
  update(_time: number, delta: number): void {
    if (!this.started || this.paused || this.ended) return;
    const dt = Math.min(delta, 50);

    this.vehicle.update(dt);
    const p = this.vehicle.position;

    const traf = this.traffic.update(dt, p, this.vehicle.isInvulnerable);
    if (traf.crashed) this.handleCrash();
    else if (traf.nearMiss) {
      sfx('near_miss');
      bus.emit(GameEvent.NearMiss);
    }

    this.orders.update(dt, p);
    this.run.tick(dt);

    Audio.setEngineIntensity(this.vehicle.normalizedSpeed);

    // Camera: look further ahead and zoom out the faster you go (sense of speed
    // + more reaction time to read the road). Lead follows the travel direction.
    const v = this.vehicle.dir;
    const spd = this.vehicle.normalizedSpeed;
    const lead = Cam.leadBase + Cam.leadSpeed * spd;
    const offX = v === Direction.East ? -lead : v === Direction.West ? lead : 0;
    const offY = v === Direction.South ? -lead : v === Direction.North ? lead : 0;
    const cam = this.cameras.main;
    cam.setFollowOffset(lerp(cam.followOffset.x, offX, 0.05), lerp(cam.followOffset.y, offY, 0.05));
    cam.setZoom(lerp(cam.zoom, Cam.zoomBase - Cam.zoomSpeed * spd, Cam.zoomLerp));
  }

  private teardown(): void {
    bus.off(GameEvent.ControlSteer, this.hSteer);
    bus.off(GameEvent.ControlThrottle, this.hThrottle);
    bus.off(GameEvent.OrderDelivered, this.hDelivered);
    bus.off(GameEvent.OrderPickedUp, this.hPicked);
    bus.off(GameEvent.OrderExpired, this.hExpired);
    bus.off(GameEvent.RunEnd, this.hRunEnd);
    bus.off(GameEvent.Pause, this.hPause);
    this.input.keyboard?.removeAllListeners();
    this.traffic?.clear();
    this.orders?.clear();
    Audio.stopEngine();
  }
}
