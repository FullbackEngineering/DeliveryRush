import { CardEffectId, PlayerProfile } from '@/types';
import type { ShopItem } from '@/data/shopItems';
import { SaveManager } from '@/managers/SaveManager';
import { bus, GameEvent } from '@/core/EventBus';
import { Services } from '@/services/ServiceLocator';
import { VEHICLE_MAP, upgradeCost } from '@/data/vehicles';

/**
 * In-memory owner of the player profile and the single place allowed to mutate
 * it. Every change persists locally, mirrors to (mock) cloud save, and emits an
 * event so UI stays in sync. Systems read via getters; they never mutate directly.
 */
class ProfileStoreImpl {
  private profile: PlayerProfile = SaveManager.load();

  get(): Readonly<PlayerProfile> {
    return this.profile;
  }

  private commit(): void {
    SaveManager.save(this.profile);
    void Services.cloudSave.save(SaveManager.serialize(this.profile));
    bus.emit(GameEvent.ProfileChanged, this.profile);
  }

  // --- Economy ------------------------------------------------------------
  addCoins(n: number): void {
    this.profile.coins = Math.max(0, this.profile.coins + Math.round(n));
    bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    this.commit();
  }

  addGems(n: number): void {
    this.profile.gems = Math.max(0, this.profile.gems + Math.round(n));
    this.commit();
  }

  spendCoins(n: number): boolean {
    if (this.profile.coins < n) return false;
    this.profile.coins -= n;
    bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    this.commit();
    return true;
  }

  spendGems(n: number): boolean {
    if (this.profile.gems < n) return false;
    this.profile.gems -= n;
    this.commit(); // ProfileChanged carries the new gem balance to the UI
    return true;
  }

  // --- Run results --------------------------------------------------------
  recordRun(coinsEarned: number, deliveries: number, score: number): void {
    this.profile.coins += Math.round(coinsEarned);
    this.profile.totalDeliveries += deliveries;
    this.profile.xp += deliveries * 10 + Math.round(score / 100);
    while (this.profile.xp >= this.xpForNext()) {
      this.profile.xp -= this.xpForNext();
      this.profile.level += 1;
    }
    if (score > this.profile.highScore) this.profile.highScore = score;
    Services.analytics.track('run_end', { coinsEarned, deliveries, score });
    void Services.leaderboard.submitScore(this.profile.name, this.profile.highScore);
    bus.emit(GameEvent.CoinsChanged, this.profile.coins);
    this.commit();
  }

  xpForNext(): number {
    return 200 + (this.profile.level - 1) * 120;
  }

  // --- Garage -------------------------------------------------------------
  selectVehicle(id: string): void {
    if (this.profile.ownedVehicles.includes(id)) {
      this.profile.selectedVehicle = id;
      this.commit();
    }
  }

  vehicleLevel(id: string): number {
    return this.profile.vehicleLevels[id] ?? 1;
  }

  canUpgradeVehicle(id: string): boolean {
    const def = VEHICLE_MAP[id];
    if (!def) return false;
    const lvl = this.vehicleLevel(id);
    return lvl < def.maxLevel && this.profile.coins >= upgradeCost(def, lvl);
  }

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
  equipCard(slot: number, id: CardEffectId): void {
    if (slot < 0 || slot > 2) return;
    if (!this.profile.ownedCards.includes(id)) return;
    this.profile.equippedCards[slot] = id;
    this.commit();
  }

  cardLevel(id: CardEffectId): number {
    return this.profile.cardLevels[id] ?? 1;
  }

  // --- Shop (market: cards / cosmetics / consumable boosts) ----------------
  /** True when a non-consumable item is already owned (boosts are re-buyable). */
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
  setSetting<K extends keyof PlayerProfile['settings']>(
    key: K,
    value: PlayerProfile['settings'][K],
  ): void {
    this.profile.settings[key] = value;
    this.commit();
  }
}

export const Profile = new ProfileStoreImpl();
