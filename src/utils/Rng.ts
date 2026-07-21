/**
 * Small, fast, seedable PRNG (mulberry32). Deterministic so procedural city
 * layouts can be reproduced / shared (e.g. daily seed).
 */
export class Rng {
  private state: number;

  // Rassal sayı üreteçini verilen tohum ile başlatır.
  constructor(seed: number = (Math.random() * 0xffffffff) >>> 0) {
    this.state = seed >>> 0;
  }

  // 0 ile 1 arası rastgele kayan nokta sayısı döndürür.
  /** Float in [0,1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Min ve max arasında rastgele kayan nokta sayısı döndürür.
  /** Float in [min,max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Min ve max (dahil) arasında rastgele tamsayı döndürür.
  /** Integer in [min,max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Olasılık p ile true döndürür.
  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  // Diziden rastgele bir öğe seçer ve döndürür.
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Diziyi yerinde Fisher–Yates algoritmasıyla karıştırır.
  /** Fisher–Yates shuffle (in place). */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// UTC gün numarasını temel alan belirleyici günlük tohum döndürür.
/** Deterministic daily seed (UTC day number). */
export function dailySeed(): number {
  return Math.floor(Date.now() / 86400000);
}
