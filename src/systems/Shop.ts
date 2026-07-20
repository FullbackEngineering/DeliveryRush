import type { PlayerProfile } from '@/types';
import type { ShopCategory, ShopItem } from '@/data/shopItems';

export type ShopItemState = 'owned' | 'affordable' | 'insufficient-funds';

export interface ShopReadModelOptions {
  /** Persistence for these items will be supplied by the integration layer. */
  ownedItemIds?: ReadonlySet<string>;
}

export interface ShopItemView {
  item: ShopItem;
  state: ShopItemState;
  balance: number;
  shortfall: number;
}

export function isShopItemOwned(
  item: ShopItem,
  profile: Readonly<PlayerProfile>,
  options: ShopReadModelOptions = {},
): boolean {
  if (item.category === 'boosts') return false;
  if (item.category === 'cards') return profile.ownedCards.includes(item.cardId);
  return options.ownedItemIds?.has(item.id) ?? false;
}

export function getShopItemView(
  item: ShopItem,
  profile: Readonly<PlayerProfile>,
  options: ShopReadModelOptions = {},
): ShopItemView {
  const balance = profile[item.price.currency];
  const owned = isShopItemOwned(item, profile, options);
  const shortfall = Math.max(0, item.price.amount - balance);

  return {
    item,
    balance,
    shortfall,
    state: owned ? 'owned' : shortfall === 0 ? 'affordable' : 'insufficient-funds',
  };
}

export function getShopCategoryItems(
  items: readonly ShopItem[],
  category: ShopCategory,
  profile: Readonly<PlayerProfile>,
  options: ShopReadModelOptions = {},
): ShopItemView[] {
  return items
    .filter((item) => item.category === category)
    .map((item) => getShopItemView(item, profile, options))
    .sort((a, b) => Number(b.item.featured ?? false) - Number(a.item.featured ?? false));
}

