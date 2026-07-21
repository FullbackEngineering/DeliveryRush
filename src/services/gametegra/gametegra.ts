import { gameTegra } from '@gametegra/sdk';

/**
 * Timeout-safe façade over the Gametegra SuperApp SDK.
 *
 * The game runs both as a plain web build AND as a Gametegra mini-app. Outside
 * the SuperApp there is no host bridge, so every SDK promise would hang forever
 * — therefore EVERY call here is wrapped in `withTimeout` and swallows errors,
 * degrading to a silent no-op when there's no host. Gameplay never depends on a
 * host being present; these are all additive platform features.
 *
 * Shapes/quirks verified against the field notes in `.claude/skills/gametegra-sdk`:
 * - `showAd` takes `{ adKey, placement }` where placement IS the ad type
 *   ('interstitial' | 'rewarded') — the SDK has no separate `adType` field.
 * - `loadData().data.data` can be an array (docs) OR a single object (real host).
 * - `getSafeAreaInsets()` is synchronous and missing from the SDK typings.
 * - leaderboard: just `createLeaderboard` unconditionally before update/get.
 */

const CALL_TIMEOUT_MS = 8000;
const HIGHSCORE_KEY = 'highscore';
const LEADERBOARD_ID = 'highscore';

let host = false; // true once a real host bridge has answered waitUntilReady()
let initPromise: Promise<boolean> | null = null;

// Promise'i verilen süre sonunda reddederek askıda kalmayı önler (timer temizlenir).
function withTimeout<T>(p: Promise<T> | T, ms = CALL_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('gametegra-timeout')), ms);
  });
  return Promise.race([Promise.resolve(p), timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

// Gerçek SuperApp host'una bağlıysa true döndürür (init sonrası).
export function isHost(): boolean {
  return host;
}

// SDK hazır olana kadar bekler; host yoksa sessizce düz-web moduna düşer.
export async function initGametegra(): Promise<boolean> {
  if (initPromise) return initPromise;
  applySafeArea(); // senkron, host beklemeden hemen uygula
  initPromise = (async () => {
    try {
      await withTimeout(gameTegra.waitUntilReady(), CALL_TIMEOUT_MS);
      host = true;
      applySafeArea();
    } catch {
      host = false;
    }
    return host;
  })();
  return initPromise;
}

// Çentik/güvenli-alan insets'lerini --sa-* CSS değişkenlerine yazar (senkron).
export function applySafeArea(): void {
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    const fn = (gameTegra as unknown as { getSafeAreaInsets?: () => typeof insets }).getSafeAreaInsets;
    if (typeof fn === 'function') insets = fn.call(gameTegra) || insets;
  } catch {
    /* no host → keep zeros */
  }
  const r = document.documentElement.style;
  r.setProperty('--sa-top', (insets.top || 0) + 'px');
  r.setProperty('--sa-bottom', (insets.bottom || 0) + 'px');
  r.setProperty('--sa-left', (insets.left || 0) + 'px');
  r.setProperty('--sa-right', (insets.right || 0) + 'px');
}

// Cihazı bir kez titreştirir (host yoksa no-op).
export function vibrate(): void {
  withTimeout(gameTegra.vibrate(), CALL_TIMEOUT_MS).catch(() => {});
}

// SuperApp/cihaz dilini döndürür ('tr', 'en', …); hata/host yoksa 'en'.
export async function getLanguage(): Promise<string> {
  try {
    const res = (await withTimeout(gameTegra.getLanguage(), CALL_TIMEOUT_MS)) as {
      data?: { appLanguage?: string; deviceLanguage?: string };
    };
    return (res?.data?.appLanguage || res?.data?.deviceLanguage || 'en').toLowerCase();
  } catch {
    return 'en';
  }
}

// loadData yanıtından girdiyi çıkarır (dizi VEYA tek obje şeklini de karşılar).
function extractLoadDataEntry(res: unknown): { value?: { score?: number } } | undefined {
  const d = (res as { data?: { data?: unknown } })?.data?.data;
  if (Array.isArray(d)) return d[0];
  if (d && typeof d === 'object') return d as { value?: { score?: number } };
  return undefined;
}

// Kalıcı depodan en yüksek skoru okur; yoksa/hata olursa null.
export async function loadHighscore(): Promise<number | null> {
  try {
    const res = await withTimeout(gameTegra.loadData({ key: HIGHSCORE_KEY }), CALL_TIMEOUT_MS);
    const entry = extractLoadDataEntry(res);
    const s = entry?.value?.score;
    return typeof s === 'number' ? s : null;
  } catch {
    return null;
  }
}

// En yüksek skoru kalıcı depoya yazar (host yoksa no-op).
export async function saveHighscore(score: number): Promise<void> {
  try {
    await withTimeout(
      gameTegra.saveData({ key: HIGHSCORE_KEY, value: { score, savedAt: new Date().toISOString() } }),
      CALL_TIMEOUT_MS,
    );
  } catch {
    /* ignore */
  }
}

// Skoru lidere tablosuna gönderir; kendi owner_id'mizi döndürür.
export async function submitScore(score: number): Promise<{ ownerId: string | null }> {
  try {
    await withTimeout(
      gameTegra.createLeaderboard({ id: LEADERBOARD_ID, sortOrder: 'desc', operator: 'best' }),
      CALL_TIMEOUT_MS,
    );
  } catch {
    /* idempotent create — ignore */
  }
  try {
    const res = (await withTimeout(
      gameTegra.updateLeaderboard({ id: LEADERBOARD_ID, score }),
      CALL_TIMEOUT_MS,
    )) as { data?: { owner_id?: string } };
    return { ownerId: res?.data?.owner_id ?? null };
  } catch {
    return { ownerId: null };
  }
}

// Lider tablosundaki en yüksek skoru ve o skorun bize ait olup olmadığını döndürür.
export async function getTopScore(myOwnerId: string | null): Promise<{ score: number; isMe: boolean } | null> {
  try {
    const res = (await withTimeout(
      gameTegra.getLeaderboard({ id: LEADERBOARD_ID, limit: 10 }),
      CALL_TIMEOUT_MS,
    )) as { data?: { records?: Array<{ score?: number | string; owner_id?: string | number }> } };
    const top = res?.data?.records?.[0];
    if (!top) return null;
    const score = Number(top.score) || 0;
    const isMe = myOwnerId != null && String(top.owner_id) === String(myOwnerId);
    return { score, isMe };
  } catch {
    return null;
  }
}

export interface GametegraBoardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

/** Creates/syncs one Kopernik board and returns live host records. Null means
 * there is no SuperApp host, so callers can deliberately use their offline data. */
export async function getKopernikLeaderboard(
  id: 'coins' | 'rush_coins' | 'deliveries',
  playerName: string,
  playerScore: number,
): Promise<GametegraBoardEntry[] | null> {
  if (!(await initGametegra())) return null;
  let ownerId: string | null = null;
  try {
    await withTimeout(gameTegra.createLeaderboard({
      id,
      sortOrder: 'desc',
      operator: 'best',
      metadata: { title: `Kopernik ${id}` },
    }), CALL_TIMEOUT_MS);
  } catch {
    /* idempotent create */
  }
  try {
    const update = (await withTimeout(gameTegra.updateLeaderboard({
      id,
      score: Math.max(0, Math.round(playerScore)),
      metadata: { name: playerName },
    }), CALL_TIMEOUT_MS)) as { data?: { owner_id?: string | number } };
    ownerId = update?.data?.owner_id != null ? String(update.data.owner_id) : null;
    const response = (await withTimeout(gameTegra.getLeaderboard({ id, limit: 20 }), CALL_TIMEOUT_MS)) as {
      data?: { records?: Array<{ score?: number | string; owner_id?: string | number; metadata?: { name?: string }; rank?: number }> };
    };
    return (response?.data?.records ?? []).map((record, index) => {
      const recordOwner = String(record.owner_id ?? '');
      const isPlayer = ownerId != null && recordOwner === ownerId;
      return {
        rank: Number(record.rank) || index + 1,
        name: isPlayer ? playerName : record.metadata?.name || `KURYE_${recordOwner.slice(-4) || index + 1}`,
        score: Number(record.score) || 0,
        isPlayer,
      };
    });
  } catch {
    return null;
  }
}

// Geçiş (interstitial) reklamı gösterir; başarısızlık oyuncuyu asla bloklamaz.
export async function showInterstitial(adKey: string): Promise<void> {
  if (!(await initGametegra())) return;
  try {
    await withTimeout(gameTegra.showAd({
      adKey,
      placement: 'interstitial',
      showLoading: true,
      metadata: { source: 'kopernik' },
    }), CALL_TIMEOUT_MS);
  } catch {
    /* ad failure never blocks the player */
  }
}

// Ödüllü (rewarded) reklam gösterir; sonuna kadar izlenirse true döndürür.
export async function showRewarded(adKey: string): Promise<boolean> {
  if (!(await initGametegra())) return false;
  try {
    const res = await withTimeout(gameTegra.showAd({
      adKey,
      placement: 'rewarded',
      showLoading: true,
      metadata: { source: 'kopernik', rewardRequested: true },
    }), CALL_TIMEOUT_MS);
    return res?.status === 'completed';
  } catch {
    return false;
  }
}

// Gerçek-para satın alma başlatır (miniapp.yaml'daki payment_packages code'u); başarıyı döndürür.
export async function startPurchase(code: string): Promise<boolean> {
  if (!(await initGametegra())) return false;
  try {
    const res = (await withTimeout(gameTegra.startPurchase({ code }), CALL_TIMEOUT_MS)) as {
      onHostSuccess?: boolean;
      errorMessage?: string | null;
      data?: { error?: string; status?: string };
    };
    if (res?.data?.error || res?.errorMessage) return false;
    return res?.onHostSuccess ?? true;
  } catch {
    return false;
  }
}

// Analitik olayı gönderir (fire-and-forget, oyunu asla bloklamaz).
export function report(eventType: string, data: Record<string, unknown>): void {
  withTimeout(gameTegra.reportEvent({ eventType, data }), CALL_TIMEOUT_MS).catch(() => {});
}
