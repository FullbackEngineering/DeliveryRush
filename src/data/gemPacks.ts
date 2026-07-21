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

// Gerçek-para elmas paketleri (kodlar miniapp.yaml ile birebir eşleşmeli).
export const GEM_PACKS: GemPack[] = [
  { code: 'gems_small', gems: 100, label: '100 Elmas' },
  { code: 'gems_medium', gems: 550, label: '550 Elmas', bonus: '+%10' },
  { code: 'gems_large', gems: 1200, label: '1200 Elmas', bonus: '+%20' },
];

// Ödüllü reklam izleyince verilen elmas miktarı.
export const AD_GEM_REWARD = 10;
