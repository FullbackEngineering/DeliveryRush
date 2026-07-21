/**
 * Real-money gem packs. Each `code` MUST match a `payment_packages[].code` in
 * `miniapp.yaml` — it's exactly what `gameTegra.startPurchase(code)` sends. The
 * real price is configured on DevPortal; the UI only shows the gem count so it
 * never displays a stale/placeholder price. `gems` is credited on success.
 */
export interface GemPack {
  code: string;
  gems: number;
  label: string;
  bonus?: string;
}

export interface CoinPack {
  code: string;
  coins: number;
  label: string;
  bonus?: string;
}

// Gerçek-para elmas paketleri (kodlar miniapp.yaml ile birebir eşleşmeli).
export const GEM_PACKS: GemPack[] = [
  { code: 'gems_small', gems: 300, label: '300 Elmas' },
  { code: 'gems_medium', gems: 900, label: '900 Elmas', bonus: '+%10' },
  { code: 'gems_large', gems: 2000, label: '2000 Elmas', bonus: 'EN İYİ DEĞER' },
];

export const COIN_PACKS: CoinPack[] = [
  { code: 'coins_small', coins: 5000, label: '5.000 Coin' },
  { code: 'coins_medium', coins: 15000, label: '15.000 Coin', bonus: '+%10' },
  { code: 'coins_large', coins: 35000, label: '35.000 Coin', bonus: '+%20' },
];

// Ödüllü reklam izleyince verilen elmas miktarı.
export const AD_GEM_REWARD = 20;
