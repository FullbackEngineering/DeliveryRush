/**
 * Global, decoupled event bus. Gameplay systems emit facts; UI, audio, effects,
 * and analytics subscribe. This keeps the architecture event-driven and avoids
 * scenes/systems reaching into each other.
 *
 * Engine-agnostic: a tiny emitter (no Phaser) so the same logic layer runs under
 * the Three.js rewrite. API mirrors the subset of Phaser's EventEmitter we used
 * (on/once/off/emit/removeAllListeners/listenerCount) so nothing else changes.
 */

export const GameEvent = {
  // Run lifecycle
  RunStart: 'run:start',
  RunEnd: 'run:end',
  Countdown: 'run:countdown',
  RunTimer: 'run:timer', // (secondsLeft, fraction)
  RunCoins: 'run:coins', // (coinsThisRun)
  RunScore: 'run:score', // (score)

  // Orders / delivery
  OrderSpawned: 'order:spawned',
  OrderPickedUp: 'order:pickedup',
  OrderDelivered: 'order:delivered',
  OrderExpired: 'order:expired',
  OrderTimer: 'order:timer', // (fraction, seconds)

  // Economy / score
  CoinsChanged: 'econ:coins',
  ScoreChanged: 'score:changed',
  ComboChanged: 'combo:changed',
  ComboBroken: 'combo:broken',

  // Jobs (SERBEST open-world job board — src/systems/JobBoard.ts)
  JobsRefreshed: 'job:refreshed', // (offered: Job[])
  JobAccepted: 'job:accepted', // (job: Job)
  JobPickedUp: 'job:pickedup', // (job: Job)
  JobDelivered: 'job:delivered', // (job: Job, result: {pay,penalty,net})
  JobFailed: 'job:failed', // (job: Job)
  JobTimer: 'job:timer', // (job: Job, secondsLeft: number, fraction: number)

  // Stop-to-order (primary SERBEST interaction — drive up to a source POI and stop)
  StopZoneEnter: 'stop:zoneenter', // (poi: Poi) — moving, in range: show the "🛑 stop" hint
  StopZoneExit: 'stop:zoneexit', // hide the hint (left range, or now stopped/opened)
  StopOrderOpen: 'stop:orderopen', // (poi: Poi, orders: Job[]) — stopped: open its order list
  StopOrderClose: 'stop:orderclose', // panel closed (left zone, tapped close, or accepted)

  // Police / speeding / fines (SERBEST — world/Police.ts)
  PoliceFine: 'police:fine', // (amount: number, reason: 'speeding' | 'crash')
  ChaseStarted: 'police:chasestart', // a patrol cop began pursuing the player
  ChaseEnded: 'police:chaseend', // player escaped (or the chase was resolved)
  Speeding: 'police:speeding', // (over: boolean) — player above the local speed limit

  // Input (from control pad / keyboard) → consumed by GameScene
  ControlSteer: 'control:steer',
  ControlSteerAxis: 'control:steeraxis', // (axis: number) — analog wheel, -1..+1
  ControlThrottle: 'control:throttle', // (on: boolean) — hold ▲ to accelerate
  ControlReverse: 'control:reverse', // (on: boolean) — hold to back up
  Pause: 'control:pause',

  // Vehicle
  SteerInput: 'vehicle:steer',
  Turned: 'vehicle:turned',
  SpeedChanged: 'vehicle:speed',
  Crash: 'vehicle:crash',
  NearMiss: 'vehicle:nearmiss',

  // Meta / persistence
  ProfileChanged: 'profile:changed',
  Purchase: 'shop:purchase',

  // Audio cue (fire-and-forget sound hooks)
  Sfx: 'audio:sfx',
  Haptic: 'ux:haptic',
} as const;

export type GameEventName = (typeof GameEvent)[keyof typeof GameEvent];

type Handler = (...args: any[]) => void;
interface Listener {
  fn: Handler;
  ctx?: unknown;
  once: boolean;
}

/** Minimal event emitter (Phaser-free). */
class Bus {
  private listeners = new Map<string, Listener[]>();

  // Olay dinleyicisini kayıt eder; event ateşlendiğinde fn çalışır.
  on(event: string, fn: Handler, ctx?: unknown): this {
    return this.add(event, fn, ctx, false);
  }
  // Bir kez çalışacak olay dinleyicisini kayıt eder, sonra kaldırır.
  once(event: string, fn: Handler, ctx?: unknown): this {
    return this.add(event, fn, ctx, true);
  }
  // Dinleyiciyi iç haritaya ekler (once flağı ile).
  private add(event: string, fn: Handler, ctx: unknown, once: boolean): this {
    const arr = this.listeners.get(event);
    if (arr) arr.push({ fn, ctx, once });
    else this.listeners.set(event, [{ fn, ctx, once }]);
    return this;
  }

  // Olay dinleyicisini kaldırır veya belirli bir olay türünün tümünü siler.
  off(event: string, fn?: Handler, ctx?: unknown): this {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }
    const arr = this.listeners.get(event);
    if (!arr) return this;
    // Remove entries matching fn (and ctx, if a ctx was supplied).
    const kept = arr.filter((l) => l.fn !== fn || (ctx !== undefined && l.ctx !== ctx));
    if (kept.length) this.listeners.set(event, kept);
    else this.listeners.delete(event);
    return this;
  }

  // Olay ateşletir; tüm dinleyicileri çağırır ve once'ler kaldırır.
  emit(event: string, ...args: unknown[]): boolean {
    const arr = this.listeners.get(event);
    if (!arr || !arr.length) return false;
    // Iterate a copy so handlers may add/remove listeners during dispatch.
    for (const l of arr.slice()) {
      l.fn.apply(l.ctx, args);
      if (l.once) this.off(event, l.fn, l.ctx);
    }
    return true;
  }

  // Belirtilen olay veya tüm dinleyicileri kaldırır.
  removeAllListeners(event?: string): this {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
    return this;
  }

  // Belirtilen olay için kayıtlı dinleyici sayısını döndürür.
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }
}

/** Process-wide singleton bus. */
export const bus = new Bus();

// Olay otobüsüne yazılmış tip ile olay ateşletir.
/** Typed emit helper (thin wrapper for readability). */
export function emit(event: GameEventName, ...args: unknown[]): void {
  bus.emit(event, ...args);
}
