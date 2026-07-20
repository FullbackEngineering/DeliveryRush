/** Framework-agnostic math helpers (kept separate from Phaser.Math for pure logic). */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Frame-rate independent exponential smoothing. */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * dt));

export const invLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : clamp((v - a) / (b - a), 0, 1);

export const manhattan = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => Math.abs(ax - bx) + Math.abs(ay - by);

/** Format seconds as M:SS. */
export const formatTime = (s: number): string => {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/** Format a coin/score number with thousands separators. */
export const formatNumber = (n: number): string =>
  Math.floor(n).toLocaleString('en-US');
