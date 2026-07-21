import { CardEffectId, PlayerProfile } from '@/types';
import { SHOP_ITEMS } from '@/data/shopItems';
import type { ShopCardItem, ShopItem } from '@/data/shopItems';
import { SaveManager } from '@/managers/SaveManager';
import { bus, GameEvent } from '@/core/EventBus';
import { Services } from '@/services/ServiceLocator';
import { VEHICLE_MAP, upgradeCost } from '@/data/vehicles';

export const DAILY_CARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface DailyCardReward {
  item: ShopCardItem | null;
  fallbackCoins: number;
  claimedAt: number;
  nextClaimAt: number;
}

/**
 * In-memory owner of the player profile and the single place allowed to mutate
 * it. Every change persists locally, mirrors to (mock) cloud save, and emits an
 * event so UI stays in sync. Systems read via getters; they never mutate directly.
 */
class ProfileStoreImpl {
  private profile: PlayerProfile = SaveManager.load();

  // Okuma-yalnız profil verisini döndürür.
  get(): Readonly<PlayerProfile> {
    return this.profile;
  }

  // Profili yerel ve bulut depolamaya kaydeder, olayı yaylar.
  private commit(): void {
    SaveManager.save(this.profile);
    void Services.cloudSave.save(SaveManager.serialize(this.profile));
    bus.emit(GameEvent.ProfileChanged, this.profile);
  }

  // --- Economy ------------------------------------------------------------
  // Oyuncuya para ekler, 0'ın altında düşmeyi engeller.
  addCoins(n: number): void {
    this.profile.coins = Math.max(0, this.profile.coins + Math.round(n));
    bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    this.commit();
  }

  // Oyuncuya mücevher ekler, 0'ın altında düşmeyi engeller.
  addGems(n: number): void {
    this.profile.gems = Math.max(0, this.profile.gems + Math.round(n));
    this.commit();
  }

  // Paraları harcamayı deneme, yeterse düşür ve true döndür, yoksa false döndür.
  spendCoins(n: number): boolean {
    if (this.profile.coins < n) return false;
    this.profile.coins -= n;
    bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    this.commit();
    return true;
  }

  // Mücevherleri harcamayı deneme, yeterse düşür ve true döndür, yoksa false.
  spendGems(n: number): boolean {
    if (this.profile.gems < n) return false;
    this.profile.gems -= n;
    this.commit(); // ProfileChanged carries the new gem balance to the UI
    return true;
  }

  // --- Run results --------------------------------------------------------
  // Koşu sonucunu kaydeder: paraları, teslim sayısını ve puanı ekler, seviyesi hesaplar.
  recordRun(coinsEarned: number, deliveries: number, score: number): void {
    this.profile.coins += Math.round(coinsEarned);
    this.profile.totalDeliveries += deliveries;
    this.profile.xp += deliveries * 10 + Math.round(score / 100);
    while (this.profile.xp >= this.xpForNext()) {
      this.profile.xp -= this.xpForNext();
      this.profile.level += 1;
    }
    if (score > this.profile.highScore) this.profile.highScore = score;
    if (coinsEarned > this.profile.bestRushCoins) this.profile.bestRushCoins = Math.round(coinsEarned);
    Services.analytics.track('run_end', { coinsEarned, deliveries, score });
    void Services.leaderboard.submitScore(this.profile.name, this.profile.highScore);
    bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    this.commit();
  }

  // Sonraki seviyeye ulaşmak için gereken deneyim puanını hesaplar.
  xpForNext(): number {
    return 200 + (this.profile.level - 1) * 120;
  }

  // --- Garage -------------------------------------------------------------
  // Sahip olunan bir aracı seçili araç olarak ayarlar.
  selectVehicle(id: string): void {
    if (this.profile.ownedVehicles.includes(id)) {
      this.profile.selectedVehicle = id;
      this.commit();
    }
  }

  // Aracın mevcut seviyesini döndürür, varsayılan 1.
  vehicleLevel(id: string): number {
    return this.profile.vehicleLevels[id] ?? 1;
  }

  // Aracın yükseltilip yükseltilemeyeceğini kontrol eder.
  canUpgradeVehicle(id: string): boolean {
    const def = VEHICLE_MAP[id];
    if (!def) return false;
    const lvl = this.vehicleLevel(id);
    return lvl < def.maxLevel && this.profile.coins >= upgradeCost(def, lvl);
  }

  // Araç yükseltir, paraları harcama başarısını kontrol eder, başarıyı döndürür.
  upgradeVehicle(id: string): boolean {
    const def = VEHICLE_MAP[id];
    if (!def) return false;
    const lvl = this.vehicleLevel(id);
    if (lvl >= def.maxLevel) return false;
    const cost = upgradeCost(def, lvl);
    if (!this.spendCoins(cost)) return false;
    this.profile.vehicleLevels[id] = lvl + 1;
    this.commit();
    return true;
  }

  // Araç kilidini açar, paraları harcama başarısını kontrol eder, başarıyı döndürür.
  unlockVehicle(id: string): boolean {
    const def = VEHICLE_MAP[id];
    if (!def || def.unlockCost < 0) return false;
    if (this.profile.ownedVehicles.includes(id)) return true;
    if (!this.spendCoins(def.unlockCost)) return false;
    this.profile.ownedVehicles.push(id);
    this.profile.vehicleLevels[id] = 1;
    this.commit();
    return true;
  }

  // --- Cards --------------------------------------------------------------
  // Sahibi olunan bir kartı belirtilen yuvaya takır.
  equipCard(slot: number, id: CardEffectId): void {
    if (slot < 0 || slot > 2) return;
    if (!this.profile.ownedCards.includes(id)) return;
    this.profile.equippedCards[slot] = id;
    this.commit();
  }

  // Kartın mevcut seviyesini döndürür, varsayılan 1.
  cardLevel(id: CardEffectId): number {
    return this.profile.cardLevels[id] ?? 1;
  }

  dailyCardRemainingMs(now = Date.now()): number {
    return Math.max(0, this.profile.lastDailyCardClaimAt + DAILY_CARD_COOLDOWN_MS - now);
  }

  /** Grants one unowned market card, then starts the persistent 24-hour timer. */
  claimDailyCard(now = Date.now()): DailyCardReward | null {
    if (this.dailyCardRemainingMs(now) > 0) return null;
    const cards = SHOP_ITEMS.filter((item): item is ShopCardItem => item.category === 'cards');
    const available = cards.filter((item) => !this.profile.ownedCards.includes(item.cardId));
    const item = available.length > 0
      ? available[Math.floor(now / DAILY_CARD_COOLDOWN_MS) % available.length]
      : null;
    const fallbackCoins = item ? 0 : 250;
    if (item) {
      this.profile.ownedCards.push(item.cardId);
      this.profile.cardLevels[item.cardId] = this.profile.cardLevels[item.cardId] ?? 1;
    } else {
      this.profile.coins += fallbackCoins;
      bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    }
    this.profile.lastDailyCardClaimAt = now;
    this.commit();
    return { item, fallbackCoins, claimedAt: now, nextClaimAt: now + DAILY_CARD_COOLDOWN_MS };
  }

  // --- Shop (market: cards / cosmetics / consumable boosts) ----------------
  /** True when a non-consumable item is already owned (boosts are re-buyable). */
  // Oyuncunun mağaza ürününü sahip olup olmadığını kontrol eder.
  ownsShopItem(item: ShopItem): boolean {
    if (item.category === 'boosts') return false;
    if (item.category === 'cards') return this.profile.ownedCards.includes(item.cardId);
    return this.profile.ownedCosmetics.includes(item.id);
  }

  /**
   * Buy a market item: spend its currency, then grant it (card → ownedCards,
   * cosmetic → ownedCosmetics, boost → +1 in the consumable inventory). Returns
   * false with no charge if it's already owned or the balance is insufficient.
   * The single mutation point for the shop — the UI just calls it and re-reads.
   */
  // Mağaza ürünü satın alır: paraları harcama ve ürünü envantera ekler, başarıyı döndürür.
  purchaseShopItem(item: ShopItem): boolean {
    if (this.ownsShopItem(item)) return false;
    const paid =
      item.price.currency === 'gems'
        ? this.spendGems(item.price.amount)
        : this.spendCoins(item.price.amount);
    if (!paid) return false;
    if (item.category === 'cards') {
      if (!this.profile.ownedCards.includes(item.cardId)) this.profile.ownedCards.push(item.cardId);
      if (this.profile.cardLevels[item.cardId] == null) this.profile.cardLevels[item.cardId] = 1;
    } else if (item.category === 'cosmetics') {
      if (!this.profile.ownedCosmetics.includes(item.id)) this.profile.ownedCosmetics.push(item.id);
    } else {
      this.profile.boostInventory[item.id] = (this.profile.boostInventory[item.id] ?? 0) + 1;
    }
    bus.emit(GameEvent.Purchase, item);
    this.commit();
    return true;
  }

  // --- Settings -----------------------------------------------------------
  // Oyuncu ayarını (ses, müzik, haptic, renk körü) ayarlar ve kaydeder.
  setSetting<K extends keyof PlayerProfile['settings']>(
    key: K,
    value: PlayerProfile['settings'][K],
  ): void {
    this.profile.settings[key] = value;
    this.commit();
  }
}

export const Profile = new ProfileStoreImpl();
