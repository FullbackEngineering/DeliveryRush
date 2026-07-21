import { RunState } from '@/systems/RunState';
import { Orders3D } from '@/world/Orders3D';
import { Vehicle3D } from '@/world/Vehicle3D';
import { Order } from '@/types';
import { Run } from '@/core/Balance';
import { bus, GameEvent } from '@/core/EventBus';

type Phase = 'idle' | 'countdown' | 'running' | 'ended';

/**
 * The single authority that turns order events into RunState economy + drives the
 * run lifecycle (3-2-1 countdown → running → ended). Mirrors the old GameScene
 * role but engine-agnostic: it owns RunState, ticks the clock, spawns the next
 * order on deliver/expire, and freezes on time-out. HUD/beacons react to the bus
 * facts it (and RunState) emit; it never touches the DOM or Three.js directly.
 */
export class RunController {
  state = new RunState();
  private phase: Phase = 'idle';

  private countSteps: Array<number | string> = [3, 2, 1, 'GO'];
  private countIdx = 0;
  private countAcc = 0;

  // Kurar: koşu durumunu ve olay aboneliklerini başlatır.
  constructor(
    private orders: Orders3D,
    private vehicle: Vehicle3D,
    private startX: number,
    private startZ: number,
  ) {
    bus.on(GameEvent.OrderDelivered, this.onDelivered);
    bus.on(GameEvent.OrderExpired, this.onExpired);
    bus.on(GameEvent.Crash, this.onCrash);
  }

  // Koşunun şu anda çalışıp çalışmadığını döndürür.
  get running(): boolean {
    return this.phase === 'running';
  }

  /** (Re)start a run: fresh state, car home, then run the intro countdown. */
  // Yeni koşu başlatır: durumu sıfırlar, geri sayımı başlatır.
  start(): void {
    this.state = new RunState();
    this.orders.reset();
    this.vehicle.reset(this.startX, this.startZ, 0);
    this.phase = 'countdown';
    this.countIdx = 0;
    this.countAcc = 0;
    bus.emit(GameEvent.Countdown, this.countSteps[0]);
  }

  // Geri sayımı ilerlettir veya koşu döngüsünü güncelleştir.
  update(dt: number): void {
    if (this.phase === 'countdown') {
      this.tickCountdown(dt);
    } else if (this.phase === 'running') {
      this.state.tick(dt * 1000); // may emit RunEnd
      if (this.state.ended) {
        this.phase = 'ended';
        this.orders.reset();
        return;
      }
      this.orders.update(dt * 1000, this.vehicle.x, this.vehicle.z, this.vehicle.yaw);
    }
  }

  // Geri sayım adımlarını ilerletir, GO'ya ulaştığında koşu başlatır.
  private tickCountdown(dt: number): void {
    this.countAcc += dt * 1000;
    const stepDur = this.countIdx < 3 ? Run.countdownStepMs : Run.countdownGoMs;
    if (this.countAcc < stepDur) return;
    this.countAcc = 0;
    this.countIdx += 1;
    if (this.countIdx < this.countSteps.length) {
      const step = this.countSteps[this.countIdx];
      bus.emit(GameEvent.Countdown, step);
      if (step === 'GO') this.beginRunning();
    }
  }

  // Koşuyu çalıştırma durumuna geçirir ve ilk işi oluşturur.
  private beginRunning(): void {
    this.phase = 'running';
    bus.emit(GameEvent.RunStart);
    this.spawnNext();
  }

  // Bir sonraki işi oluşturur, zorluk seviyesine uygun parametrelerle.
  private spawnNext(): void {
    if (this.state.ended) return;
    this.orders.spawn(
      this.vehicle.x,
      this.vehicle.z,
      this.state.vipChance(),
      this.state.orderTimeLimit(),
    );
  }

  // İş teslimini işler: durumu günceller, ses çalar ve sonraki işi oluşturur.
  private onDelivered = (order: Order): void => {
    if (this.phase !== 'running') return;
    this.state.onDelivered(order); // emits ComboChanged / RunCoins / RunScore + banks time
    bus.emit(GameEvent.Sfx, 'deliver');
    this.spawnNext();
  };

  // Süre biten işi işler: seriyi kırar, ses çalar ve sonraki işi oluşturur.
  private onExpired = (): void => {
    if (this.phase !== 'running') return;
    this.state.onOrderExpired();
    bus.emit(GameEvent.Sfx, 'miss');
    this.spawnNext();
  };

  // Çarpışmayı işler: seriyi kırabilir ve zamanı kesebilir.
  private onCrash = (): void => {
    if (this.phase !== 'running') return;
    this.state.onCrash(); // breaks combo (unless a free-crash charge) + docks time
  };

  // Olay aboneliklerini temizler, kaynakları serbest bırakır.
  destroy(): void {
    bus.off(GameEvent.OrderDelivered, this.onDelivered);
    bus.off(GameEvent.OrderExpired, this.onExpired);
    bus.off(GameEvent.Crash, this.onCrash);
  }
}
