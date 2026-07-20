/**
 * Shared domain types & enums for Delivery Rush.
 * Kept free of Phaser/Three imports so any layer (data, services, systems) can
 * use them. `OrderKind` is a type-only import from `data/orderKinds.ts`, which
 * itself has no dependency back on this file, so no runtime cycle is created.
 */
import type { OrderKind } from '@/data/orderKinds';

/** Cardinal heading on the city grid. Screen space: +x right, +y down. */
export enum Direction {
  North = 'N',
  East = 'E',
  South = 'S',
  West = 'W',
}

/** Unit vector for a heading in screen space (+y is down). */
export const DIR_VECTORS: Record<Direction, { x: number; y: number }> = {
  [Direction.North]: { x: 0, y: -1 },
  [Direction.East]: { x: 1, y: 0 },
  [Direction.South]: { x: 0, y: 1 },
  [Direction.West]: { x: -1, y: 0 },
};

/** Steering intent produced by the 3-button control pad. */
export enum Steer {
  Left = 'left',
  Straight = 'straight',
  Right = 'right',
}

/** Turn a heading left / right / straight. */
export function applySteer(dir: Direction, steer: Steer): Direction {
  const order = [Direction.North, Direction.East, Direction.South, Direction.West];
  const i = order.indexOf(dir);
  if (steer === Steer.Right) return order[(i + 1) % 4];
  if (steer === Steer.Left) return order[(i + 3) % 4];
  return dir;
}

/** Rotation (radians) for a heading, with North = up (car art points "up"/north by default). */
export function dirToAngle(dir: Direction): number {
  switch (dir) {
    case Direction.North:
      return -Math.PI / 2;
    case Direction.East:
      return 0;
    case Direction.South:
      return Math.PI / 2;
    case Direction.West:
      return Math.PI;
  }
}

export enum Rarity {
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

export type CurrencyId = 'coins' | 'gems';

/** Tunable vehicle stats (0..1 normalized where noted). Drives feel + upgrades. */
export interface VehicleStats {
  speed: number; // world px/s at cruise
  acceleration: number; // px/s^2
  handling: number; // 0..1, affects turn snappiness + off-lane recovery
  braking: number; // px/s^2 when releasing / crashing
  durability: number; // crash hits before game-feel penalty scales
  fuel: number; // seconds of range (reserved for later)
  nitro: number; // 0..1 boost strength (reserved)
  cargo: number; // simultaneous orders capacity (reserved, MVP = 1)
}

/**
 * 3D free-driving handling for a vehicle, in real meters/second units — this is
 * what `world/Vehicle3D` actually drives with (the px `VehicleStats` above are the
 * legacy 2D numbers, kept for the dormant Phaser build). Distinct per car so the
 * garage roster feels different. `accel` is the **acceleration limit**: the max
 * m/s² the car can gain speed on the gas — a heavy scooter climbs to speed slowly,
 * a hyper leaps off the line. This is the knob that makes the roster read.
 */
export interface DriveStats {
  topSpeed: number; // m/s reached at full throttle
  accel: number; // m/s² acceleration limit (speed gained per second on the gas)
  turn: number; // rad/s max steering (yaw) rate
}

export interface VehicleDef {
  id: string;
  name: string;
  /** Base (level 1) stats. */
  base: VehicleStats;
  /** Per-level additive growth applied on upgrade. */
  growth: Partial<VehicleStats>;
  /** 3D driving handling (meters). What `Vehicle3D` uses; differentiates the roster. */
  drive: DriveStats;
  /** Per-level additive growth for the 3D drive stats (upgrades = faster car). */
  driveGrowth?: Partial<DriveStats>;
  /** Unlock cost in coins (0 = starter, -1 = premium/locked). */
  unlockCost: number;
  bodyColor: number;
  accentColor: number;
  maxLevel: number;
}

export type CardEffectId =
  | 'policeIgnore'
  | 'highwaySpeed'
  | 'fuelBoost'
  | 'coinBonus'
  | 'trafficReduction'
  | 'freeFirstCrash'
  | 'vipOrders'
  | 'droneDelivery'
  | 'slowMotion'
  | 'magnetCoins';

export interface CardDef {
  id: CardEffectId;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string; // texture key generated at runtime
  accent: number;
  /** Effect magnitude at level 1 and per-level growth (interpretation is effect-specific). */
  value: number;
  valueGrowth: number;
  maxLevel: number;
}

export interface ThemeDef {
  id: string;
  name: string;
  sky: number;
  ground: number;
  road: number;
  roadLine: number;
  buildingPalette: number[];
  accent: number;
  /** 0..1 hazard density multiplier for procedural difficulty flavor. */
  hazardBias: number;
}

// --- SERBEST open-world orders (POIs + JobBoard) ----------------------------

/** A physical destination in the SERBEST open world: a restaurant/cafe/cargo
 * depot (pickup source) or a home/office (drop-off). Placed by `PoiSystem`
 * (`src/world/Pois.ts`), which owns the 3D marker/landmark for each one. */
export type PoiType = 'restaurant' | 'cafe' | 'cargo' | 'home' | 'office';

export interface Poi {
  id: number;
  type: PoiType;
  name: string;
  emoji: string;
  color: number;
  isSource: boolean;
  /** Grid cell + world (meters) position of the plot this POI occupies. */
  col: number;
  row: number;
  x: number;
  z: number;
}

/**
 * An open-world job (SERBEST): drive to `source` to pick up, then `dest` to
 * deliver, before `timeLimit` seconds elapse (from acceptance). Pure data —
 * `JobBoard` (`src/systems/JobBoard.ts`) owns the state machine + economy.
 */
export interface Job {
  id: number;
  kind: OrderKind; // from data/orderKinds.ts (emoji/label/color)
  source: Poi; // where you pick up
  dest: Poi; // where you deliver
  distanceM: number; // manhattan metres source→dest
  pay: number; // coins on on-time delivery
  timeLimit: number; // seconds granted from acceptance
  penaltyBase: number; // coins basis for the late-penalty formula
  special: boolean; // daily special (⭐ boosted pay, low penalty)
  state: 'offered' | 'active' | 'toPickup' | 'toDropoff' | 'done' | 'failed';
}

/** A single delivery order. */
export interface Order {
  id: number;
  kind: string; // 'Pizza' | 'Coffee' | ...
  icon: string;
  baseReward: number;
  vip: boolean;
  /** Grid cell of the pickup and dropoff (col,row of a road-adjacent target). */
  pickup: { col: number; row: number };
  dropoff: { col: number; row: number };
  timeLimit: number; // seconds to complete once picked up
  pickedUp: boolean;
}

/** Persisted player profile. */
export interface PlayerProfile {
  version: number;
  name: string;
  level: number;
  xp: number;
  coins: number;
  gems: number;
  highScore: number;
  totalDeliveries: number;
  selectedVehicle: string;
  vehicleLevels: Record<string, number>;
  ownedVehicles: string[];
  equippedCards: CardEffectId[];
  cardLevels: Partial<Record<CardEffectId, number>>;
  ownedCards: CardEffectId[];
  /** Cosmetic market items owned (ids from data/shopItems.ts). */
  ownedCosmetics: string[];
  /** Consumable boost inventory: shop item id → count held (spent on a future run). */
  boostInventory: Record<string, number>;
  settings: {
    sound: boolean;
    music: boolean;
    haptics: boolean;
    colorblind: boolean;
  };
}
