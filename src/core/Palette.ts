/**
 * Central color system for Delivery Rush.
 * Dark premium theme with green (go/success), blue (info/premium), orange (energy/coins)
 * accents — matching the reference mockups. Colors as 0xRRGGBB ints for Phaser,
 * with string helpers for CSS/text where needed.
 */

export const Palette = {
  // Base surfaces
  bg: 0x0b1220,
  bgDeep: 0x070c16,
  panel: 0x141d2e,
  panelHi: 0x1d2942,
  panelLine: 0x2b3a58,
  overlay: 0x0a0f1a,

  // Text
  text: 0xe6edf7,
  textDim: 0x9fb0c9,
  textMute: 0x64748b,

  // Brand accents
  green: 0x37d67a,
  greenDeep: 0x1f9d57,
  blue: 0x3b82f6,
  blueDeep: 0x2563eb,
  cyan: 0x38bdf8,
  orange: 0xf5a524,
  orangeDeep: 0xe0810b,
  red: 0xef4444,
  redDeep: 0xdc2626,
  purple: 0x8b5cf6,
  gold: 0xffd54a,

  // Gameplay world
  asphalt: 0x2a3242,
  asphaltDark: 0x222937,
  laneLine: 0xf2c94c,
  sidewalk: 0x39435a,
  grass: 0x23412f,

  // Rarity
  rarityCommon: 0x94a3b8,
  rarityRare: 0x3b82f6,
  rarityEpic: 0x8b5cf6,
  rarityLegendary: 0xf5a524,

  white: 0xffffff,
  black: 0x000000,
} as const;

/** 0xRRGGBB int -> '#rrggbb' string. */
export function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

/** Linear blend between two 0xRRGGBB ints. t in [0,1]. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff,
    ag = (a >> 8) & 0xff,
    ab = a & 0xff;
  const br = (b >> 16) & 0xff,
    bg = (b >> 8) & 0xff,
    bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function rarityColor(rarity: string): number {
  switch (rarity) {
    case 'rare':
      return Palette.rarityRare;
    case 'epic':
      return Palette.rarityEpic;
    case 'legendary':
      return Palette.rarityLegendary;
    default:
      return Palette.rarityCommon;
  }
}
