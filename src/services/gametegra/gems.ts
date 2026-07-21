import { Profile } from '@/managers/ProfileStore';
import { GemPack, AD_GEM_REWARD } from '@/data/gemPacks';
import { isHost, startPurchase, showRewarded, report } from './gametegra';

/**
 * Gem economy ↔ Gametegra bridge: real-money IAP and a rewarded-ad grant. Both
 * are host-gated (no SuperApp → no-op) and credit gems through the single Profile
 * mutation point, so ownership/persistence/UI stay consistent with the rest of
 * the game.
 */

// Gerçek-para ile elmas paketi satın alır; başarılıysa profile elmas ekler.
export async function buyGems(pack: GemPack): Promise<boolean> {
  if (!isHost()) return false;
  const ok = await startPurchase(pack.code);
  if (ok) {
    Profile.addGems(pack.gems);
    report('purchase', { code: pack.code, gems: pack.gems });
  }
  return ok;
}

// Ödüllü reklam izlenip tamamlanınca sabit miktarda elmas verir.
export async function watchAdForGems(): Promise<boolean> {
  if (!isHost()) return false;
  const done = await showRewarded('gems_reward');
  if (done) {
    Profile.addGems(AD_GEM_REWARD);
    report('rewarded_gems', { gems: AD_GEM_REWARD });
  }
  return done;
}
