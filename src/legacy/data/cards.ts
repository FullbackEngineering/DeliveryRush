import { CardDef, Rarity } from '@/types';
import { Palette } from '@/core/Palette';

/**
 * Collectible ability cards. Player equips up to 3 before a run (see profile).
 * `value` interpretation is per-effect and documented inline. Data-driven so the
 * shop/collection screens and the in-run effect resolver read from one place.
 */
export const CARDS: CardDef[] = [
  {
    id: 'policeIgnore',
    name: 'Police Ignore You',
    description: 'Police units never chase for the whole run.',
    rarity: Rarity.Epic,
    icon: 'card_police',
    accent: Palette.blue,
    value: 1,
    valueGrowth: 0,
    maxLevel: 3,
  },
  {
    id: 'highwaySpeed',
    name: 'Highway Speed +30%',
    description: 'Top speed increased while on long straights.',
    rarity: Rarity.Rare,
    icon: 'card_speed',
    accent: Palette.purple,
    value: 0.3, // +30% at lvl1
    valueGrowth: 0.05,
    maxLevel: 5,
  },
  {
    id: 'fuelBoost',
    name: 'Fuel +20%',
    description: 'Extra range so you can chase distant VIP orders.',
    rarity: Rarity.Common,
    icon: 'card_fuel',
    accent: Palette.green,
    value: 0.2,
    valueGrowth: 0.05,
    maxLevel: 5,
  },
  {
    id: 'coinBonus',
    name: 'Coin Bonus +25%',
    description: 'Every delivery pays out more coins.',
    rarity: Rarity.Rare,
    icon: 'card_coin',
    accent: Palette.orange,
    value: 0.25,
    valueGrowth: 0.05,
    maxLevel: 5,
  },
  {
    id: 'trafficReduction',
    name: 'Traffic Reduction',
    description: 'Fewer cars on the road this run.',
    rarity: Rarity.Rare,
    icon: 'card_traffic',
    accent: Palette.green,
    value: 0.3, // -30% cars
    valueGrowth: 0.05,
    maxLevel: 4,
  },
  {
    id: 'freeFirstCrash',
    name: 'Free First Crash',
    description: 'Your first crash keeps the combo alive.',
    rarity: Rarity.Common,
    icon: 'card_shield',
    accent: Palette.cyan,
    value: 1,
    valueGrowth: 1, // +1 free crash per level
    maxLevel: 3,
  },
  {
    id: 'vipOrders',
    name: 'VIP Orders Spawn More',
    description: 'Higher chance of lucrative VIP deliveries.',
    rarity: Rarity.Epic,
    icon: 'card_vip',
    accent: Palette.gold,
    value: 0.15,
    valueGrowth: 0.05,
    maxLevel: 4,
  },
  {
    id: 'droneDelivery',
    name: 'Drone Delivery',
    description: 'A drone auto-completes one order early each run.',
    rarity: Rarity.Legendary,
    icon: 'card_drone',
    accent: Palette.cyan,
    value: 1,
    valueGrowth: 0,
    maxLevel: 2,
  },
  {
    id: 'slowMotion',
    name: 'Slow Motion',
    description: 'Time briefly slows when you approach a dropoff.',
    rarity: Rarity.Epic,
    icon: 'card_slowmo',
    accent: Palette.purple,
    value: 0.6, // time scale at effect
    valueGrowth: -0.05,
    maxLevel: 3,
  },
  {
    id: 'magnetCoins',
    name: 'Magnet Coins',
    description: 'Coins on the road are pulled toward you.',
    rarity: Rarity.Rare,
    icon: 'card_magnet',
    accent: Palette.orange,
    value: 180, // magnet radius px
    valueGrowth: 40,
    maxLevel: 4,
  },
];

export const CARD_MAP = Object.fromEntries(CARDS.map((c) => [c.id, c])) as Record<
  string,
  CardDef
>;
