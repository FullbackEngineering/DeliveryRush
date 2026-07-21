import { Order } from '@/types';
import { Run, Scoring, Difficulty } from '@/core/Balance';
import { bus, GameEvent } from '@/core/EventBus';

export interface DeliveryResult {
  coins: number;
  multiplier: number;
  vip: boolean;
  timeAdded: number;
}

/**
 * Pure run-scoped state machine for the score/combo/timer economy. No Phaser
 * deps — it only holds numbers, applies the balance formulas, and emits facts on
 * the bus for the HUD and juice systems to react to.
 */
export class RunState {
  time: number = Run.startTime;
  streak = 0; // consecutive deliveries without a miss
  maxStreak = 0; // best streak reached this run (for the results "best combo")
  deliveries = 0;
  coinsThisRun = 0;
  score = 0;
  ended = false;

  /** Card-derived modifiers, set by GameScene before the run. */
  coinBonus = 1; // multiplier (1 = none)
  freeCrashes = 0; // remaining "free crash" charges

  // Seri sayısıyla sınırlandırılan harita çarpanını döndürür.
  get multiplier(): number {
    return Math.max(1, Math.min(Scoring.comboCap, this.streak));
  }

  /** 0..1 difficulty based on deliveries completed. */
  // Teslim edilen işler sayısına göre zorluk seviyesi (0..1) döndürür.
  get difficulty(): number {
    return Math.min(1, this.deliveries / Difficulty.rampDeliveries);
  }

  /** Time limit granted to a freshly spawned order (shrinks with difficulty). */
  // Yeni işler için zaman limitini zorluk seviyesine uygun olarak döndürür.
  orderTimeLimit(): number {
    return Math.round(
      Difficulty.orderTimeStart -
        (Difficulty.orderTimeStart - Difficulty.orderTimeMin) * this.difficulty,
    );
  }

  // Yeni işin VIP olma ihtimalini zorluk seviyesine uygun olarak döndürür.
  vipChance(): number {
    return (
      Difficulty.vipChanceStart +
      (Difficulty.vipChanceMax - Difficulty.vipChanceStart) * this.difficulty
    );
  }

  // İş teslimini işler, seriyi arttırır, paraları hesaplar ve sonucu döndürür.
  onDelivered(order: Order): DeliveryResult {
    this.streak += 1;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    this.deliveries += 1;
    const mult = this.multiplier;
    const vipMult = order.vip ? Scoring.vipMultiplier : 1;
    const coins = Math.round(order.baseReward * mult * vipMult * this.coinBonus);
    this.coinsThisRun += coins;
    const timeAdded = Math.min(Run.timePerDelivery, Run.maxTime - this.time);
    this.time = Math.min(Run.maxTime, this.time + Run.timePerDelivery);
    this.score += Math.round(coins * Scoring.scoreFactor) + Scoring.scorePerDelivery;

    bus.emit(GameEvent.ComboChanged, this.streak, mult);
    bus.emit(GameEvent.RunCoins, this.coinsThisRun);
    bus.emit(GameEvent.RunScore, this.score);
    return { coins, multiplier: mult, vip: order.vip, timeAdded: Math.max(0, timeAdded) };
  }

  /** @returns true if the combo actually broke (no free-crash charge). */
  // Çarpışmayı işler, seriyi kırabilir, zamanı dökebilir; başarıyı döndürür.
  onCrash(): boolean {
    if (this.freeCrashes > 0) {
      this.freeCrashes -= 1;
      return false;
    }
    const had = this.streak > 0;
    this.streak = 0;
    this.time = Math.max(0, this.time - 2);
    if (had) {
      bus.emit(GameEvent.ComboChanged, 0, 1);
      bus.emit(GameEvent.ComboBroken);
    }
    return had;
  }

  // Süre biten işi işler, seriyi kırabilir.
  onOrderExpired(): void {
    if (this.streak > 0) {
      this.streak = 0;
      bus.emit(GameEvent.ComboChanged, 0, 1);
      bus.emit(GameEvent.ComboBroken);
    }
  }

  // Koşu zamanlayıcısını ilerletir, biterse RunEnd olayı yaydır.
  tick(dtMs: number): void {
    if (this.ended) return;
    this.time -= dtMs / 1000;
    if (this.time <= 0) {
      this.time = 0;
      this.ended = true;
      bus.emit(GameEvent.RunTimer, 0, 0);
      bus.emit(GameEvent.RunEnd, this.summary());
      return;
    }
    bus.emit(GameEvent.RunTimer, this.time, this.time / Run.maxTime);
  }

  // Koşu sonuçlarını (paraları, teslim işler, puan, en iyi seri) döndürür.
  summary() {
    return {
      coins: this.coinsThisRun,
      deliveries: this.deliveries,
      score: this.score,
      bestStreak: this.maxStreak,
    };
  }
}
