/** Framework-agnostic math helpers (kept separate from Phaser.Math for pure logic). */

// Değeri min ve max arasında kısıtlar.
export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

// İki sayı arasında doğrusal enterpolasyon yapar (t: 0-1).
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Kare-hızdan bağımsız üstel yumuşatma uygular.
/** Frame-rate independent exponential smoothing. */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

// Enterpolasyon parametresini hesaplar; v hangi t değerinde a ve b arası yer alır.
export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : clamp((v - a) / (b - a), 0, 1);

// Manhattan mesafesini (grid adım sayısı) hesaplar.
export const manhattan = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => Math.abs(ax - bx) + Math.abs(ay - by);

// Saniyeyi M:SS formatında string'e çevirir.
/** Format seconds as M:SS. */
export const formatTime = (s: number): string => {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// Sayıyı binlik ayırıcılarla biçimlendirir (paranız/skor).
/** Format a coin/score number with thousands separators. */
export const formatNumber = (n: number): string =>
  Math.floor(n).toLocaleString('en-US');
