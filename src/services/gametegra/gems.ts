import { Profile } from '@/managers/ProfileStore';
import { CoinPack, GemPack, AD_GEM_REWARD } from '@/data/gemPacks';
import { Services } from '@/services/ServiceLocator';
import { isHost, startPurchase, showRewarded, report, PurchaseOutcome } from './gametegra';

/**
 * Gem economy ↔ Gametegra bridge: real-money IAP and a rewarded-ad grant. Both
 * are host-gated (no SuperApp → no-op) and credit gems through the single Profile
 * mutation point, so ownership/persistence/UI stay consistent with the rest of
 * the game.
 *
 * ⚠️ Currency is credited ONLY on `outcome.ok`, i.e. only when the host itself
 * confirmed the payment (`res.data.success`). Treating the envelope's
 * `onHostSuccess` as success would hand out paid gems on every host-side
 * failure, because it only means "the call reached the host".
 */

// Gerçek-para ile elmas paketi satın alır; SADECE host onayladıysa elmas ekler.
export async function buyGems(pack: GemPack): Promise<PurchaseOutcome> {
  const outcome = await startPurchase(pack.code);
  if (outcome.ok) {
    Profile.addGems(pack.gems);
    report('purchase', { code: pack.code, gems: pack.gems });
  } else {
    report(outcome.cancelled ? 'purchase_cancelled' : 'purchase_failed', {
      code: pack.code,
      errorCode: outcome.errorCode ?? null,
    });
  }
  return outcome;
}

/** Real-money coin pack. The host owns the displayed price and payment sheet. */
export async function buyCoins(pack: CoinPack): Promise<PurchaseOutcome> {
  const outcome = await startPurchase(pack.code);
  if (outcome.ok) {
    Profile.addCoins(pack.coins);
    report('purchase', { code: pack.code, coins: pack.coins });
  } else {
    report(outcome.cancelled ? 'purchase_cancelled' : 'purchase_failed', {
      code: pack.code,
      errorCode: outcome.errorCode ?? null,
    });
  }
  return outcome;
}

// Ödüllü reklam izlenip tamamlanınca sabit miktarda elmas verir.
export async function watchAdForGems(): Promise<boolean> {
  let done = await showRewarded('kopernik_gems_reward', 'shop_gems_reward');
  if (!done && !isHost() && import.meta.env.DEV) {
    done = (await Services.ads.show('reward_daily')).completed;
  }
  if (done) {
    Profile.addGems(AD_GEM_REWARD);
    report('rewarded_gems', { gems: AD_GEM_REWARD });
  }
  return done;
}

/** Main-menu rewarded ad. Kept separate from the gem reward so each placement
 * can be tuned and reported independently without mutating UI code. */
export async function watchAdForCoins(): Promise<boolean> {
  const reward = 100;
  let done = await showRewarded('kopernik_menu_coin_reward', 'menu_coin_reward');
  if (!done && !isHost() && import.meta.env.DEV) {
    done = (await Services.ads.show('reward_daily')).completed;
  }
  if (done) {
    Profile.addCoins(reward);
    report('rewarded_coins', { coins: reward });
  }
  return done;
}
