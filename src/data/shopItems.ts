import type { CardEffectId, CurrencyId, Rarity } from '@/types';

export type ShopCategory = 'cards' | 'boosts' | 'cosmetics';

export interface ShopPrice {
  currency: CurrencyId;
  amount: number;
}

interface ShopItemBase {
  id: string;
  category: ShopCategory;
  name: string;
  description: string;
  icon: string;
  price: ShopPrice;
  rarity: Rarity;
  featured?: boolean;
}

export interface ShopCardItem extends ShopItemBase {
  category: 'cards';
  cardId: CardEffectId;
}

export interface ShopBoostItem extends ShopItemBase {
  category: 'boosts';
  boostId: 'doubleCoins' | 'comboShield' | 'headStart';
  /** Consumables can be bought repeatedly and are never displayed as owned. */
  consumable: true;
}

export interface ShopCosmeticItem extends ShopItemBase {
  category: 'cosmetics';
  cosmeticId: 'neonTrail' | 'goldTrail' | 'pizzaTopper';
}

export type ShopItem = ShopCardItem | ShopBoostItem | ShopCosmeticItem;

export const SHOP_CATEGORIES: ReadonlyArray<{
  id: ShopCategory;
  label: string;
  icon: string;
}> = [
  { id: 'cards', label: 'Kartlar', icon: '🃏' },
  { id: 'boosts', label: 'Boost', icon: '⚡' },
  { id: 'cosmetics', label: 'Stil', icon: '✨' },
];

/**
 * Market catalog only. Vehicle sales deliberately remain in the garage.
 * Prices live with the content until the market is wired into global tuning.
 */
export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'card-police-ignore',
    category: 'cards',
    cardId: 'policeIgnore',
    name: 'Görünmez Kurye',
    description: 'Polisler bir koşu boyunca seni görmezden gelir.',
    icon: '🚨',
    price: { currency: 'gems', amount: 45 },
    rarity: 'epic' as Rarity,
    featured: true,
  },
  {
    id: 'card-vip-orders',
    category: 'cards',
    cardId: 'vipOrders',
    name: 'VIP Bağlantısı',
    description: 'Daha fazla yüksek ödüllü VIP siparişi sunar.',
    icon: '💎',
    price: { currency: 'coins', amount: 1800 },
    rarity: 'epic' as Rarity,
  },
  {
    id: 'card-drone-delivery',
    category: 'cards',
    cardId: 'droneDelivery',
    name: 'Kurye Dronu',
    description: 'Bir siparişi otomatik tamamlayan nadir yardımcı.',
    icon: '🚁',
    price: { currency: 'gems', amount: 90 },
    rarity: 'legendary' as Rarity,
  },
  {
    id: 'card-magnet-coins',
    category: 'cards',
    cardId: 'magnetCoins',
    name: 'Bozuk Para Mıknatısı',
    description: 'Yakındaki yol paralarını aracına çeker.',
    icon: '🧲',
    price: { currency: 'coins', amount: 950 },
    rarity: 'rare' as Rarity,
  },
  {
    id: 'boost-double-coins',
    category: 'boosts',
    boostId: 'doubleCoins',
    name: 'Çifte Kazanç',
    description: 'Sonraki koşuda teslimat paralarını ikiye katlar.',
    icon: '🪙',
    price: { currency: 'coins', amount: 350 },
    rarity: 'rare' as Rarity,
    consumable: true,
    featured: true,
  },
  {
    id: 'boost-combo-shield',
    category: 'boosts',
    boostId: 'comboShield',
    name: 'Kombo Kalkanı',
    description: 'Sonraki koşuda ilk hatan komboyu bozmaz.',
    icon: '🛡️',
    price: { currency: 'coins', amount: 275 },
    rarity: 'common' as Rarity,
    consumable: true,
  },
  {
    id: 'boost-head-start',
    category: 'boosts',
    boostId: 'headStart',
    name: 'Hızlı Başlangıç',
    description: 'Sonraki koşuya ekstra süreyle başla.',
    icon: '⏱️',
    price: { currency: 'gems', amount: 12 },
    rarity: 'common' as Rarity,
    consumable: true,
  },
  {
    id: 'cosmetic-neon-trail',
    category: 'cosmetics',
    cosmeticId: 'neonTrail',
    name: 'Neon İz',
    description: 'Gece yollarında turkuaz bir ışık izi bırak.',
    icon: '🌌',
    price: { currency: 'coins', amount: 1200 },
    rarity: 'rare' as Rarity,
  },
  {
    id: 'cosmetic-gold-trail',
    category: 'cosmetics',
    cosmeticId: 'goldTrail',
    name: 'Altın İz',
    description: 'Teslimat rotana efsanevi altın parıltı kat.',
    icon: '🌟',
    price: { currency: 'gems', amount: 70 },
    rarity: 'legendary' as Rarity,
    featured: true,
  },
  {
    id: 'cosmetic-pizza-topper',
    category: 'cosmetics',
    cosmeticId: 'pizzaTopper',
    name: 'Pizza Tabelası',
    description: 'Aracının üstüne sallanan mini pizza tabelası ekle.',
    icon: '🍕',
    price: { currency: 'coins', amount: 800 },
    rarity: 'common' as Rarity,
  },
] as const;

export const SHOP_ITEM_MAP = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

