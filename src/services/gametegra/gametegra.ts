import { gameTegra } from '@gametegra/sdk';

/**
 * Timeout-safe façade over the Gametegra SuperApp SDK.
 *
 * The game runs both as a plain web build AND as a Gametegra mini-app. Outside
 * the SuperApp there is no host bridge, so every SDK promise would hang forever
 * — therefore EVERY call here is wrapped in `withTimeout` and degrades to a
 * silent no-op when there's no host. Gameplay never depends on a host being
 * present; these are all additive platform features.
 *
 * ⚠️ The SDK's own `index.d.ts` describes a contract the real host does NOT
 * implement — a wrong `showAd` call compiles perfectly clean in strict mode and
 * the ad simply never opens. The shapes below follow the device-verified field
 * notes in `gametegra-claude-skills` (SDK 0.3.8), not the typings:
 * - `showAd` needs `adType` ('interstitial' | 'rewarded'), and `placement` is a
 *   host WHITELIST ('miniapp_open') — not the ad type and not free text. Our own
 *   slot label rides along in the schemaless `metadata.placement`.
 * - `showAd` / `startPurchase` answer inside a `SuperAppResponse` envelope:
 *   `res.data.status` / `res.data.success`. Reading `res.status` / `res.success`
 *   always yields `undefined`, and `onHostSuccess: true` only means the call
 *   REACHED the host — never that the ad played or the payment went through.
 * - `loadData().data.data` can be an array (docs) OR a single object (real host).
 * - `getSafeAreaInsets()` is synchronous and missing from the SDK typings.
 * - leaderboard: just `createLeaderboard` unconditionally before update/get.
 *
 * Diagnostics: there are no DevTools on a real device, so every ad/payment
 * failure is logged to `console.warn` AND `devConsole`, and `?adlog` opens the
 * in-WebView console panel. Never swallow a host error silently here.
 */

const CALL_TIMEOUT_MS = 8000;
/** Rewarded video runs 15-30s — the 8s call timeout would cut a PLAYING ad. */
const AD_TIMEOUT_MS = 120000;
/** Payment sheet + 3D-secure is slow; 8s aborts while the player is still paying. */
const PURCHASE_TIMEOUT_MS = 120000;
const HOST_READY_TIMEOUT_MS = 4000;
const HIGHSCORE_KEY = 'highscore';
const LEADERBOARD_ID = 'highscore';
/**
 * Host-side whitelist value — NOT free text and NOT the ad type. Any in-game
 * slot name here comes back `invalid_placement` and the ad never opens at all.
 */
const AD_PLACEMENT = 'miniapp_open';

let hostReady = false; // true once a real host bridge has answered waitUntilReady()
let initPromise: Promise<boolean> | null = null;

// Promise'i verilen süre sonunda reddederek askıda kalmayı önler (timer temizlenir).
function withTimeout<T>(p: Promise<T> | T, ms = CALL_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('gametegra-timeout')), ms);
  });
  return Promise.race([Promise.resolve(p), timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

// Host köprüsü sayfaya enjekte edilmiş mi (düz tarayıcıda boşuna beklememek için).
function bridgePresent(): boolean {
  try {
    const sdkBridge = (gameTegra as unknown as { superapp?: unknown }).superapp;
    const winBridge = (window as unknown as { superapp?: unknown }).superapp;
    return sdkBridge != null || winBridge != null;
  } catch {
    return false;
  }
}

// Gerçek SuperApp host'una bağlıysa true döndürür (son ensureHostReady sonucu).
export function isHost(): boolean {
  return hostReady;
}

/**
 * Refreshes host readiness before EVERY ad / payment / leaderboard call.
 * A single boot-time `waitUntilReady()` that times out on a cold WebView would
 * otherwise leave a one-shot flag false and kill ads for the WHOLE session.
 */
export async function ensureHostReady(
  timeoutMs = HOST_READY_TIMEOUT_MS,
  skipIfNoBridge = true,
): Promise<boolean> {
  if (hostReady) return true;
  if (skipIfNoBridge && !bridgePresent()) return false; // düz tarayıcı — bekleme
  try {
    await withTimeout(gameTegra.waitUntilReady(), timeoutMs);
    hostReady = true;
    applySafeArea(); // insets ancak host bağlandıktan sonra gerçek değeri döner
  } catch {
    hostReady = false;
  }
  return hostReady;
}

// SDK hazır olana kadar bekler; host yoksa sessizce düz-web moduna düşer.
export async function initGametegra(): Promise<boolean> {
  if (initPromise) return initPromise;
  applySafeArea(); // senkron, host beklemeden hemen uygula
  openDevConsoleIfRequested();
  // Boot'ta köprü kontrolünü ATLA (skipIfNoBridge=false): bridge SDK'dan biraz
  // sonra enjekte edilebiliyor. Buradaki olumsuz sonuç kalıcı DEĞİL — sonraki
  // her çağrı ensureHostReady() ile yeniden dener.
  initPromise = ensureHostReady(CALL_TIMEOUT_MS, false);
  return initPromise;
}

// `?adlog` ile açılan cihaz-içi konsol paneli (gerçek cihazda DevTools yok).
function openDevConsoleIfRequested(): void {
  try {
    if (!new URLSearchParams(window.location.search).has('adlog')) return;
    gameTegra.devConsole?.show({ interceptConsole: true });
  } catch {
    /* host/panel yok — teşhis anahtarı sessizce devre dışı */
  }
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

// --- Diagnostics ------------------------------------------------------------

function safeStringify(value: unknown): string {
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** No DevTools on a real device — mirror every failure into the host's console. */
function logSdkFailure(kind: string, key: string, detail: unknown): void {
  const msg = `gametegra: ${kind} başarısız (key="${key}") → ${safeStringify(detail)}`;
  console.warn(msg);
  try {
    gameTegra.devConsole?.warn?.(msg);
  } catch {
    /* panel yok */
  }
}

// Cihazı bir kez titreştirir (host yoksa no-op).
export function vibrate(): void {
  if (!bridgePresent()) return;
  withTimeout(gameTegra.vibrate(), CALL_TIMEOUT_MS).catch(() => {});
}

// SuperApp/cihaz dilini döndürür ('tr', 'en', …); hata/host yoksa 'en'.
export async function getLanguage(): Promise<string> {
  if (!(await ensureHostReady())) return 'en';
  try {
    const res = (await withTimeout(gameTegra.getLanguage(), CALL_TIMEOUT_MS)) as {
      data?: { appLanguage?: string; deviceLanguage?: string };
    };
    return (res?.data?.appLanguage || res?.data?.deviceLanguage || 'en').toLowerCase();
  } catch {
    return 'en';
  }
}

/**
 * The player's real SuperApp nickname, for the leaderboard. Cached after the
 * first successful read; null outside the SuperApp (offline/browser play keeps
 * whatever local name the profile already has). Only `name` is read — email/age
 * are personal data we never put on a public board.
 */
let cachedPlayerName: string | null = null;

export async function getPlayerName(): Promise<string | null> {
  if (cachedPlayerName) return cachedPlayerName;
  if (!(await ensureHostReady())) return null;
  try {
    const res = (await withTimeout(gameTegra.getUserInfo(), CALL_TIMEOUT_MS)) as {
      data?: { name?: string };
      name?: string;
    };
    const name = (res?.data?.name ?? res?.name ?? '').trim();
    if (!name) return null;
    cachedPlayerName = name;
    return name;
  } catch (err) {
    logSdkFailure('getUserInfo', 'player_name', err);
    return null;
  }
}

// --- Highscore --------------------------------------------------------------

// loadData yanıtından girdiyi çıkarır (dizi VEYA tek obje şeklini de karşılar).
function extractLoadDataEntry(res: unknown): { value?: { score?: number } } | undefined {
  const d = (res as { data?: { data?: unknown } })?.data?.data;
  if (Array.isArray(d)) return d[0];
  if (d && typeof d === 'object') return d as { value?: { score?: number } };
  return undefined;
}

// Kalıcı depodan en yüksek skoru okur; yoksa/hata olursa null.
export async function loadHighscore(): Promise<number | null> {
  if (!(await ensureHostReady())) return null;
  try {
    const res = await withTimeout(gameTegra.loadData({ key: HIGHSCORE_KEY }), CALL_TIMEOUT_MS);
    const entry = extractLoadDataEntry(res);
    const s = entry?.value?.score;
    return typeof s === 'number' ? s : null;
  } catch {
    return null; // ilk oyunda kayıt yok — beklenen durum, log gürültüsü yapma
  }
}

// En yüksek skoru kalıcı depoya yazar (host yoksa no-op).
export async function saveHighscore(score: number): Promise<void> {
  if (!(await ensureHostReady())) return;
  try {
    await withTimeout(
      gameTegra.saveData({ key: HIGHSCORE_KEY, value: { score, savedAt: new Date().toISOString() } }),
      CALL_TIMEOUT_MS,
    );
  } catch (err) {
    logSdkFailure('saveData', HIGHSCORE_KEY, err);
  }
}

// --- Leaderboard ------------------------------------------------------------

// Skoru lider tablosuna gönderir; kendi owner_id'mizi döndürür.
export async function submitScore(score: number): Promise<{ ownerId: string | null }> {
  if (!(await ensureHostReady())) return { ownerId: null };
  try {
    await withTimeout(
      gameTegra.createLeaderboard({ id: LEADERBOARD_ID, sortOrder: 'desc', operator: 'best' }),
      CALL_TIMEOUT_MS,
    );
  } catch {
    /* idempotent create — zaten varsa host hata/no-op döner, yoksay */
  }
  try {
    const res = (await withTimeout(
      gameTegra.updateLeaderboard({ id: LEADERBOARD_ID, score }),
      CALL_TIMEOUT_MS,
    )) as { data?: { owner_id?: string } };
    return { ownerId: res?.data?.owner_id ?? null };
  } catch (err) {
    logSdkFailure('updateLeaderboard', LEADERBOARD_ID, err);
    return { ownerId: null };
  }
}

// Lider tablosundaki en yüksek skoru ve o skorun bize ait olup olmadığını döndürür.
export async function getTopScore(myOwnerId: string | null): Promise<{ score: number; isMe: boolean } | null> {
  if (!(await ensureHostReady())) return null;
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
  } catch (err) {
    logSdkFailure('getLeaderboard', LEADERBOARD_ID, err);
    return null;
  }
}

export interface GametegraBoardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

interface LeaderboardRecord {
  score?: number | string;
  owner_id?: string | number;
  metadata?: { name?: string };
  rank?: number | string;
}

// Host kaydını ekran satırına çevirir (kendi kaydımızsa oyuncunun adını kullan).
function toBoardEntry(
  record: LeaderboardRecord,
  index: number,
  ownerId: string | null,
  playerName: string,
): GametegraBoardEntry {
  const recordOwner = String(record.owner_id ?? '');
  const isPlayer = ownerId != null && recordOwner === ownerId;
  return {
    rank: Number(record.rank) || index + 1,
    name: isPlayer ? playerName : record.metadata?.name || `KURYE_${recordOwner.slice(-4) || index + 1}`,
    score: Number(record.score) || 0,
    isPlayer,
  };
}

/** Creates/syncs one Kopernik board and returns live host records. Null means
 * there is no SuperApp host, so callers can deliberately use their offline data. */
export async function getKopernikLeaderboard(
  id: 'coins' | 'rush_coins' | 'deliveries',
  playerName: string,
  playerScore: number,
): Promise<GametegraBoardEntry[] | null> {
  if (!(await ensureHostReady())) return null;
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
      data?: { records?: LeaderboardRecord[]; owner_records?: LeaderboardRecord[] };
    };
    const rows = (response?.data?.records ?? [])
      .map((record, index) => toBoardEntry(record, index, ownerId, playerName));
    // Outside the top 20 the player would never see themselves on the board —
    // append their own row (with its real rank) from the host's `owner_records`.
    if (!rows.some((row) => row.isPlayer)) {
      const mine = (response?.data?.owner_records ?? [])
        .find((record) => ownerId != null && String(record.owner_id ?? '') === ownerId);
      if (mine) rows.push({ ...toBoardEntry(mine, rows.length, ownerId, playerName), isPlayer: true });
    }
    return rows;
  } catch (err) {
    logSdkFailure('leaderboard', id, err);
    return null;
  }
}

// --- Ads --------------------------------------------------------------------

interface AdParams {
  placement: string;
  adType: 'interstitial' | 'rewarded';
  adKey: string;
  showLoading?: boolean;
  metadata?: Record<string, unknown>;
}

/** The SDK typings know no `adType` and mistake `placement` for the ad type, so
 *  the correct call cannot be expressed through them — cast past the typings. */
function callShowAd(params: AdParams): Promise<unknown> {
  return (gameTegra.showAd as unknown as (p: AdParams) => Promise<unknown>)(params);
}

interface AdOutcome {
  hostOk: boolean;
  status?: string;
  reward: number;
  errorCode?: string;
  errorMessage: string | null;
  raw: unknown;
}

// Yanıt iki şekilden biri gelebilir: SuperAppResponse zarfı veya düz sonuç.
function unwrapAdResult(res: unknown): AdOutcome {
  const top = (res ?? {}) as Record<string, unknown>;
  const isEnvelope = 'onHostSuccess' in top || 'onClientSuccess' in top;
  const body = (isEnvelope ? top.data : top) as Record<string, unknown> | undefined;
  return {
    hostOk: isEnvelope ? top.onHostSuccess === true : true,
    status: typeof body?.status === 'string' ? body.status : undefined,
    reward: Number(body?.reward) || 0,
    errorCode: typeof body?.errorCode === 'string' ? body.errorCode : undefined,
    errorMessage: typeof top.errorMessage === 'string' ? top.errorMessage : null,
    raw: res,
  };
}

/** Ödüllü reklam sonuna kadar izlendi mi → ödül hak edildi mi? */
function isRewardEarned(o: AdOutcome): boolean {
  return o.hostOk && o.errorMessage == null && (o.status === 'completed' || o.reward > 0);
}

/**
 * Shows an interstitial; a failure must never block the player.
 * @param adKey BackOffice reporting dimension — developer-defined, never empty.
 * @param slot  In-game placement label; `placement` is a whitelist, so our own
 *              label travels in the schemaless `metadata` instead.
 */
export async function showInterstitial(adKey: string, slot = adKey): Promise<void> {
  if (!(await ensureHostReady())) return;
  try {
    const o = unwrapAdResult(await withTimeout(callShowAd({
      placement: AD_PLACEMENT,
      adType: 'interstitial',
      adKey,
      showLoading: true,
      metadata: { source: 'kopernik', placement: slot },
    }), AD_TIMEOUT_MS));
    if (!o.hostOk || o.status === 'error') logSdkFailure('interstitial', adKey, o.raw);
  } catch (err) {
    logSdkFailure('interstitial', adKey, err); // yut ama SESSİZCE değil
  }
}

// Ödüllü (rewarded) reklam gösterir; sonuna kadar izlenirse true döndürür.
export async function showRewarded(adKey: string, slot = adKey): Promise<boolean> {
  if (!(await ensureHostReady())) return false;
  try {
    const o = unwrapAdResult(await withTimeout(callShowAd({
      placement: AD_PLACEMENT,
      adType: 'rewarded',
      adKey,
      showLoading: true,
      metadata: { source: 'kopernik', placement: slot, rewardRequested: true },
    }), AD_TIMEOUT_MS));
    if (isRewardEarned(o)) return true;
    logSdkFailure('rewarded', adKey, o.raw); // ödül verme, ama oyuncuyu kilitleme
    return false;
  } catch (err) {
    logSdkFailure('rewarded', adKey, err);
    return false;
  }
}

// --- Purchases --------------------------------------------------------------

export interface PurchaseOutcome {
  /** Only true when the HOST confirmed the payment — the sole gate for granting. */
  ok: boolean;
  /** Player dismissed the payment sheet: normal flow, never show an error. */
  cancelled: boolean;
  errorCode?: string;
}

interface PurchaseUnwrapped {
  hostOk: boolean;
  success: boolean;
  errorCode?: string;
  raw: unknown;
}

// Reklamla aynı zarf disiplini: `res.success` YANLIŞ, `res.data.success` doğru.
function unwrapPurchaseResult(res: unknown): PurchaseUnwrapped {
  const top = (res ?? {}) as Record<string, unknown>;
  const isEnvelope = 'onHostSuccess' in top || 'onClientSuccess' in top;
  const body = (isEnvelope ? top.data : top) as Record<string, unknown> | undefined;
  const code = body?.error_code ?? body?.errorCode;
  return {
    hostOk: isEnvelope ? top.onHostSuccess === true : true,
    success: body?.success === true,
    errorCode: typeof code === 'string' && code ? code : undefined,
    raw: res,
  };
}

/** `startPurchase` is a bare passthrough to `superapp.startPurchase(arg)` inside
 *  the SDK, so the accepted argument shape is the HOST's call, not the SDK's. */
function callStartPurchase(arg: unknown): Promise<unknown> {
  return (gameTegra.startPurchase as unknown as (a: unknown) => Promise<unknown>)(arg);
}

async function attemptPurchase(code: string, arg: unknown): Promise<PurchaseOutcome> {
  try {
    const o = unwrapPurchaseResult(await withTimeout(callStartPurchase(arg), PURCHASE_TIMEOUT_MS));
    if (o.hostOk && o.success) return { ok: true, cancelled: false };
    if (o.errorCode) {
      logSdkFailure('satın alma', code, o.raw);
      return { ok: false, cancelled: false, errorCode: o.errorCode };
    }
    if (!o.hostOk) {
      logSdkFailure('satın alma', code, o.raw);
      return { ok: false, cancelled: false, errorCode: 'host_unreachable' };
    }
    return { ok: false, cancelled: true }; // hata kodu yok → oyuncu vazgeçti
  } catch (err) {
    logSdkFailure('satın alma', code, err);
    return { ok: false, cancelled: false, errorCode: 'timeout' };
  }
}

/**
 * Starts a real-money purchase (a `payment_packages[].code` from miniapp.yaml).
 * `ok: true` ONLY when the host confirmed the payment — `onHostSuccess` merely
 * means the call reached the host, never that money changed hands.
 */
export async function startPurchase(code: string): Promise<PurchaseOutcome> {
  if (!(await ensureHostReady())) return { ok: false, cancelled: false, errorCode: 'no_host' };
  // Kanonik çağrı, cihazda doğrulanmış hâliyle: düz string `code`.
  const out = await attemptPurchase(code, code);
  if (out.errorCode !== 'invalid_payment_code') return out;
  // `invalid_payment_code` is a PRE-FLIGHT validation error: no payment sheet
  // opened and nothing was charged, so retrying once with the `{ code }` shape
  // the SDK's own typings/README describe is safe. Whichever contract this host
  // build is on then works, and the devConsole log shows which one won.
  return attemptPurchase(code, { code });
}

// Analitik olayı gönderir (fire-and-forget, oyunu asla bloklamaz).
export function report(eventType: string, data: Record<string, unknown>): void {
  if (!bridgePresent()) return;
  withTimeout(gameTegra.reportEvent({ eventType, data }), CALL_TIMEOUT_MS).catch(() => {});
}
