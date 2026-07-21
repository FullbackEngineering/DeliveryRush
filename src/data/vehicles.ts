import { DriveStats, VehicleDef } from '@/types';
import { Palette } from '@/core/Palette';

/**
 * Data-driven vehicle roster. Matches the garage progression in the mockups:
 * Starter → Sport → Super → Hyper. Stats normalized to the ranges used by the
 * driving model (see Balance/Vehicle). No pay-to-win: upgrades are coin-gated.
 */
export const VEHICLES: VehicleDef[] = [
  {
    id: 'starter',
    name: 'City Scooter',
    base: {
      speed: 240,
      acceleration: 520,
      handling: 0.72,
      braking: 640,
      durability: 3,
      fuel: 60,
      nitro: 0.2,
      cargo: 1,
    },
    growth: { speed: 14, acceleration: 24, handling: 0.02, durability: 0.5 },
    // Slowest of the roster: a deliberate climb (~3s to a modest ~65 km/h top).
    drive: { topSpeed: 18, accel: 6.0, turn: 2.35 },
    driveGrowth: { topSpeed: 0.8, accel: 0.35, turn: 0.02 },
    unlockCost: 0,
    bodyColor: Palette.gold,
    accentColor: 0xe08a1e,
    maxLevel: 6,
  },
  {
    id: 'sport',
    name: 'Sport Coupe',
    base: {
      speed: 285,
      acceleration: 620,
      handling: 0.8,
      braking: 720,
      durability: 3,
      fuel: 80,
      nitro: 0.35,
      cargo: 1,
    },
    growth: { speed: 16, acceleration: 26, handling: 0.02, durability: 0.5 },
    // Noticeably punchier off the line and a higher ~86 km/h top.
    drive: { topSpeed: 24, accel: 8.5, turn: 2.5 },
    driveGrowth: { topSpeed: 0.9, accel: 0.45, turn: 0.02 },
    unlockCost: 7500,
    bodyColor: Palette.red,
    accentColor: 0xffb4a2,
    maxLevel: 6,
  },
  {
    id: 'super',
    name: 'Super GT',
    base: {
      speed: 320,
      acceleration: 720,
      handling: 0.86,
      braking: 760,
      durability: 4,
      fuel: 100,
      nitro: 0.5,
      cargo: 2,
    },
    growth: { speed: 18, acceleration: 30, handling: 0.015, durability: 0.5 },
    // Strong acceleration, ~104 km/h top — a real step up from the Sport.
    drive: { topSpeed: 29, accel: 11.5, turn: 2.62 },
    driveGrowth: { topSpeed: 1.0, accel: 0.55, turn: 0.015 },
    unlockCost: 20000,
    bodyColor: Palette.blue,
    accentColor: 0x8ec5ff,
    maxLevel: 6,
  },
  {
    id: 'hyper',
    name: 'Hyper X',
    base: {
      speed: 360,
      acceleration: 820,
      handling: 0.92,
      braking: 820,
      durability: 4,
      fuel: 120,
      nitro: 0.7,
      cargo: 2,
    },
    growth: { speed: 20, acceleration: 32, handling: 0.012, durability: 0.5 },
    // Fastest of the roster: leaps off the line, ~126 km/h top. The clear opposite
    // end from the starter so the garage's slow↔fast spread is unmistakable.
    drive: { topSpeed: 35, accel: 15.0, turn: 2.75 },
    driveGrowth: { topSpeed: 1.1, accel: 0.65, turn: 0.012 },
    unlockCost: -1, // premium / locked
    bodyColor: 0x1f2733,
    accentColor: Palette.purple,
    maxLevel: 6,
  },
];

export const VEHICLE_MAP: Record<string, VehicleDef> = Object.fromEntries(
  VEHICLES.map((v) => [v.id, v]),
);

// Bir araçı bir seviye yükseltmek için gereken para maliyetini döndürür.
/** Cost in coins to upgrade a vehicle from `level` to `level+1`. */
export function upgradeCost(def: VehicleDef, level: number): number {
  return Math.round(500 * Math.pow(1.8, level - 1) + (def.unlockCost > 0 ? def.unlockCost * 0.08 : 300));
}

// Belirli bir seviyedeki araçın 3D sürüş istatistiklerini hesaplar (hız/ivme/dönüş).
/** Effective 3D drive stats (top speed / acceleration / turn) at a given level —
 *  upgrades make the same car faster. This is what `Vehicle3D` is built with. */
export function driveStatsAtLevel(def: VehicleDef, level: number): DriveStats {
  const n = Math.max(0, level - 1);
  const g = def.driveGrowth ?? {};
  return {
    topSpeed: def.drive.topSpeed + (g.topSpeed ?? 0) * n,
    accel: def.drive.accel + (g.accel ?? 0) * n,
    turn: def.drive.turn + (g.turn ?? 0) * n,
  };
}

// Belirli bir seviyedeki araçın tüm istatistiklerini hesaplar.
/** Compute effective stats for a vehicle at a given level. */
export function statsAtLevel(def: VehicleDef, level: number) {
  const s = { ...def.base };
  const g = def.growth;
  const n = Math.max(0, level - 1);
  s.speed += (g.speed ?? 0) * n;
  s.acceleration += (g.acceleration ?? 0) * n;
  s.handling = Math.min(1, s.handling + (g.handling ?? 0) * n);
  s.braking += (g.braking ?? 0) * n;
  s.durability += (g.durability ?? 0) * n;
  s.fuel += (g.fuel ?? 0) * n;
  s.nitro = Math.min(1, s.nitro + (g.nitro ?? 0) * n);
  return s;
}
