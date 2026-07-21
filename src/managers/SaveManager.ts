import { PlayerProfile } from '@/types';
import { VEHICLES } from '@/data/vehicles';

/**
 * Local persistence for the player profile. Uses localStorage now; the same blob
 * is mirrored to the (mock) cloud-save service by ProfileStore. Versioned so we
 * can migrate the schema safely as the game grows.
 */
const STORAGE_KEY = 'delivery_rush_profile_v1';
const PROFILE_VERSION = 2;

// Yeni oyuncu için varsayılan profili döndürür.
export function defaultProfile(): PlayerProfile {
  return {
    version: PROFILE_VERSION,
    name: 'KuryeKral',
    level: 1,
    xp: 0,
    coins: 500,
    gems: 50,
    highScore: 0,
    totalDeliveries: 0,
    selectedVehicle: 'starter',
    vehicleLevels: { starter: 1 },
    ownedVehicles: ['starter'],
    equippedCards: ['coinBonus', 'freeFirstCrash', 'highwaySpeed'],
    cardLevels: { coinBonus: 1, freeFirstCrash: 1, highwaySpeed: 1 },
    ownedCards: ['coinBonus', 'freeFirstCrash', 'highwaySpeed', 'fuelBoost', 'trafficReduction'],
    ownedCosmetics: [],
    boostInventory: {},
    settings: { sound: true, music: true, haptics: true, colorblind: false },
  };
}

export const SaveManager = {
  // localStorage'dan profili yükler, hata durumunda varsayılan profili döndürür.
  load(): PlayerProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw) as PlayerProfile;
      return migrate(parsed);
    } catch {
      return defaultProfile();
    }
  },

  // Profili localStorage'a kaydetmeyi deneme, başarısızlık sessizce yoksayılır.
  save(profile: PlayerProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* storage may be unavailable (private mode) — fail silently */
    }
  },

  // Profili JSON stringine dönüştürür, bulut kaydı için.
  serialize(profile: PlayerProfile): string {
    return JSON.stringify(profile);
  },

  // Profili varsayılana sıfırlar ve localStorage'a kaydeder.
  reset(): PlayerProfile {
    const p = defaultProfile();
    this.save(p);
    return p;
  },
};

/** Fill in any fields added in newer versions so old saves don't crash. */
// Eski kayıtlarda eksik alanları yeni değerlerle doldurarak şemayı günceller.
function migrate(p: PlayerProfile): PlayerProfile {
  const base = defaultProfile();
  const merged: PlayerProfile = {
    ...base,
    ...p,
    settings: { ...base.settings, ...(p.settings ?? {}) },
    vehicleLevels: { ...base.vehicleLevels, ...(p.vehicleLevels ?? {}) },
    cardLevels: { ...base.cardLevels, ...(p.cardLevels ?? {}) },
    boostInventory: { ...base.boostInventory, ...(p.boostInventory ?? {}) },
    ownedCosmetics: p.ownedCosmetics ?? base.ownedCosmetics,
  };
  // Guarantee every owned vehicle has a level entry.
  for (const id of merged.ownedVehicles) {
    if (!merged.vehicleLevels[id]) merged.vehicleLevels[id] = 1;
  }
  if (!VEHICLES.some((v) => v.id === merged.selectedVehicle)) {
    merged.selectedVehicle = 'starter';
  }
  merged.version = PROFILE_VERSION;
  return merged;
}
