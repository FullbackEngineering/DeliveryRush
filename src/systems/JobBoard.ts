import { Job, Poi } from '@/types';
import { ORDER_KINDS } from '@/data/orderKinds';
import { Econ, Nav } from '@/core/Balance';
import { Rng } from '@/utils/Rng';
import { PoiSystem } from '@/world/Pois';
import { Profile } from '@/managers/ProfileStore';
import { clamp } from '@/utils/MathUtils';
import { bus, GameEvent } from '@/core/EventBus';

export interface JobResult {
  pay: number;
  penalty: number;
  net: number;
}

/**
 * Pure, engine-agnostic logic for SERBEST's open-world job board (mirrors
 * `systems/RunState.ts`'s style: no Three.js deps, just numbers + bus facts).
 * Each source POI carries its own small rotating slate of jobs (`ordersAt`);
 * the **primary** interaction is stop-to-order — drive up to a source and come
 * to a stop to open its list (see `tick`'s stop-zone state machine). The 📋
 * global board (`offered`, all sources combined) is an optional shortcut.
 * Single active-job model: accepts ONE at a time, and drives pickup/deliver
 * arrival checks each `tick()` against the player's world position. Economy
 * (pay/time/late-penalty) comes from `Balance.Econ`; coins land straight in
 * `Profile` (SERBEST is persistent-wallet, no run timer).
 */
export class JobBoard {
  offered: Job[] = [];
  active: Job | null = null;
  /** Seconds left on the active job's timer (negative once late). */
  remaining = 0;
  /** Consecutive on-time deliveries — boosts the pay on newly-offered jobs. */
  streak = 0;
  /** The source POI whose stop-to-order panel is currently open (hysteresis). */
  stoppedAt: Poi | null = null;

  private nextId = 1;
  private refreshTimer = 0;
  /** Source POI the player is currently near-but-moving (world "🛑 stop" hint). */
  private nearHintAt: Poi | null = null;
  /** POI id the player explicitly closed while still parked in its zone — stays
   * closed until they leave the zone, so closing doesn't instantly reopen it. */
  private dismissedPoiId: number | null = null;

  constructor(private pois: PoiSystem, private rng: Rng) {}

  get remainingFraction(): number {
    return this.active && this.active.timeLimit > 0
      ? clamp(this.remaining / this.active.timeLimit, 0, 1)
      : 0;
  }

  /** All current offers sourced at `poi` (stop-to-order panel content). */
  ordersAt(poi: Poi): Job[] {
    return this.offered.filter((j) => j.source.id === poi.id);
  }

  /** Roll a fresh slate of `Econ.ordersPerPoiMin..Max` jobs per source POI.
   * Leaves `active` untouched — offers and the active job are independent. */
  refresh(): void {
    this.ensureSourceAndDestCoverage();
    const sources = this.pois.list.filter((p) => p.isSource);
    const dests = this.pois.list.filter((p) => !p.isSource);
    if (!sources.length || !dests.length) return;

    const comboMult = Math.min(Econ.payComboCap, 1 + this.streak * Econ.payComboStep);
    const jobs: Job[] = [];
    for (const source of sources) {
      const count = this.rng.int(Econ.ordersPerPoiMin, Econ.ordersPerPoiMax);
      for (let i = 0; i < count; i++) {
        const dest = this.rng.pick(dests);
        const kind = this.rng.pick(ORDER_KINDS);
        const distanceM = Math.round(Math.abs(source.x - dest.x) + Math.abs(source.z - dest.z));
        const distanceKm = distanceM / 1000;
        const pay = Math.round((Econ.payBase + Econ.payPerKm * distanceKm) * comboMult);
        const timeLimit = Math.max(Econ.timeMin, Math.round(distanceKm * Econ.timePerKm));
        jobs.push({
          id: this.nextId++, kind, source, dest, distanceM, pay, timeLimit,
          penaltyBase: pay, special: false, state: 'offered',
        });
      }
    }

    // Mark 1–2 daily specials (boosted pay, reduced penalty). Uses the shared
    // world `rng`, which boot.ts seeds from `dailySeed()`, so which jobs land as
    // specials is stable for a given day's play session.
    const order = jobs.map((_, i) => i);
    this.rng.shuffle(order);
    const numSpecial = Math.min(jobs.length, this.rng.chance(0.5) ? 2 : 1);
    for (let i = 0; i < numSpecial; i++) {
      const job = jobs[order[i]];
      job.special = true;
      job.pay = Math.round(job.pay * Econ.specialPayMul);
      job.penaltyBase = job.pay;
    }

    this.offered = jobs;
    bus.emit(GameEvent.JobsRefreshed, this.offered);
  }

  /** Guarantee at least one source POI and one dest POI exist so a job can
   * always be formed. `Pois.place` rolls each POI's role independently from
   * `POI_DEFS`, so — vanishingly rarely — every spawned POI could land on the
   * same role, leaving `refresh()` unable to pair a source with a dest. Rather
   * than special-case that in the job-building loop, coerce one POI to the
   * missing role; it's a shared object (`this.pois.list`), so the flip also
   * fixes the stop-to-order zone (`tickStopZone`) and any other POI-role
   * lookups for the rest of the session. */
  private ensureSourceAndDestCoverage(): void {
    const list = this.pois.list;
    if (list.length < 2) return; // fewer than 2 POIs: no pairing is possible regardless
    const hasSource = list.some((p) => p.isSource);
    const hasDest = list.some((p) => !p.isSource);
    if (hasSource && hasDest) return;
    this.rng.pick(list).isSource = !hasSource;
  }

  /** Accept an offered job as the single active job. Ignored if one's already active. */
  accept(id: number): boolean {
    if (this.active) return false;
    const idx = this.offered.findIndex((j) => j.id === id);
    if (idx < 0) return false;
    const job = this.offered[idx];
    this.offered.splice(idx, 1);
    job.state = 'toPickup';
    this.active = job;
    this.remaining = job.timeLimit;
    this.closeStop();
    bus.emit(GameEvent.JobAccepted, job);
    return true;
  }

  /** Abandon the active job (small streak reset, no payout). */
  cancel(): void {
    if (!this.active) return;
    const job = this.active;
    job.state = 'failed';
    this.active = null;
    this.streak = 0;
    this.refreshTimer = Econ.refreshEverySec; // roll fresh offers promptly
    bus.emit(GameEvent.JobFailed, job);
  }

  /** Explicitly dismiss the open stop-to-order panel (close button / backdrop
   * tap). Stays closed until the player leaves the source's zone. */
  closeStop(): void {
    if (!this.stoppedAt) return;
    this.dismissedPoiId = this.stoppedAt.id;
    this.stoppedAt = null;
    bus.emit(GameEvent.StopOrderClose);
  }

  /** Advance the active job's timer + arrival checks, the stop-to-order zone
   * state machine, and re-roll offers on cadence while nothing is active. Call
   * every frame with the player's world XZ + current speed (km/h). */
  tick(dt: number, px: number, pz: number, speedKmh: number): void {
    if (!this.active) {
      this.refreshTimer += dt;
      if (this.refreshTimer >= Econ.refreshEverySec || this.offered.length === 0) {
        this.refresh();
        this.refreshTimer = 0;
      }
    } else {
      const job = this.active;
      this.remaining -= dt;
      bus.emit(GameEvent.JobTimer, job, this.remaining, this.remainingFraction);

      const targetPoi: Poi = job.state === 'toPickup' ? job.source : job.dest;
      const dist = Math.hypot(targetPoi.x - px, targetPoi.z - pz);
      if (dist <= Nav.reachM) {
        if (job.state === 'toPickup') {
          job.state = 'toDropoff';
          bus.emit(GameEvent.JobPickedUp, job);
        } else {
          this.deliver(job);
        }
      }
    }

    this.tickStopZone(px, pz, speedKmh);
  }

  /** Stop-to-order: driving up to a source POI and coming to a stop opens its
   * order list (primary interaction); driving through above `stopThreshold`
   * never opens it. Hysteresis — stays open until the player leaves the zone
   * or dismisses it; leaving clears the dismiss-lock so returning re-triggers. */
  private tickStopZone(px: number, pz: number, speedKmh: number): void {
    const nearSource = this.pois.list.find(
      (p) => p.isSource && Math.hypot(p.x - px, p.z - pz) <= Nav.orderZoneRadius,
    ) ?? null;

    if (this.stoppedAt && nearSource?.id !== this.stoppedAt.id) {
      this.stoppedAt = null;
      bus.emit(GameEvent.StopOrderClose);
    }
    if (this.nearHintAt && nearSource?.id !== this.nearHintAt.id) {
      this.nearHintAt = null;
      bus.emit(GameEvent.StopZoneExit);
    }
    if (!nearSource) {
      this.dismissedPoiId = null;
      return;
    }
    if (this.stoppedAt) return; // already open — no re-fire while parked

    if (speedKmh < Nav.stopThreshold) {
      if (this.dismissedPoiId === nearSource.id) return; // closed here; stay closed till they leave
      this.stoppedAt = nearSource;
      bus.emit(GameEvent.StopOrderOpen, nearSource, this.ordersAt(nearSource));
    } else if (this.nearHintAt?.id !== nearSource.id) {
      this.nearHintAt = nearSource;
      bus.emit(GameEvent.StopZoneEnter, nearSource);
    }
  }

  private deliver(job: Job): void {
    const lateSeconds = Math.max(0, -this.remaining);
    const specialMul = job.special ? Econ.specialPenaltyMul : 1;
    const penalty = lateSeconds > 0
      ? Math.round(Math.min(job.penaltyBase, Econ.penaltyK * Math.log(1 + lateSeconds)) * specialMul)
      : 0;
    const onTime = lateSeconds === 0;

    job.state = 'done';
    this.active = null;
    this.streak = onTime ? this.streak + 1 : 0;

    const net = job.pay - penalty;
    Profile.addCoins(net);

    const result: JobResult = { pay: job.pay, penalty, net };
    bus.emit(GameEvent.JobDelivered, job, result);
  }
}
