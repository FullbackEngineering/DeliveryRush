import { ThemeDef } from '@/types';

/**
 * City themes. Each run picks a theme (daily rotation in the mockups:
 * Istanbul/Tokyo/Dubai/New York...). Colors drive the procedural texture
 * generation so every theme feels distinct without extra art assets.
 */
export const THEMES: ThemeDef[] = [
  {
    id: 'modern',
    name: 'Istanbul',
    sky: 0x14243a,
    ground: 0x1a2740,
    road: 0x2a3242,
    roadLine: 0xf2c94c,
    buildingPalette: [0x33507a, 0x3d6ea5, 0x4a5a76, 0x5c7ba0, 0x2f3e5c],
    accent: 0x37d67a,
    hazardBias: 0.4,
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    sky: 0x1a1030,
    ground: 0x201640,
    road: 0x2b2440,
    roadLine: 0xff5edb,
    buildingPalette: [0x6d28d9, 0xdb2777, 0x2563eb, 0x0891b2, 0x4338ca],
    accent: 0xff5edb,
    hazardBias: 0.7,
  },
  {
    id: 'dubai',
    name: 'Dubai',
    sky: 0x2a1c10,
    ground: 0x3a2a18,
    road: 0x40382c,
    roadLine: 0xffe08a,
    buildingPalette: [0xd9a441, 0xc98a2b, 0xe0b060, 0xa87830, 0xf0c674],
    accent: 0xffcf5c,
    hazardBias: 0.5,
  },
  {
    id: 'newyork',
    name: 'New York',
    sky: 0x101826,
    ground: 0x16202f,
    road: 0x262c38,
    roadLine: 0xf6c445,
    buildingPalette: [0x3b4658, 0x4a566b, 0x2e3644, 0x556074, 0x646f84],
    accent: 0x38bdf8,
    hazardBias: 0.6,
  },
  {
    id: 'snow',
    name: 'Snow City',
    sky: 0x1b2a3d,
    ground: 0x2b3c50,
    road: 0x3a4a5e,
    roadLine: 0xdfeaf5,
    buildingPalette: [0x5a7088, 0x6b83a0, 0x47586d, 0x7d95ad, 0x8fa7bf],
    accent: 0x9fd8ff,
    hazardBias: 0.65,
  },
];

export const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<
  string,
  ThemeDef
>;

/** Pick the theme for a given day index (daily rotation). */
export function themeForDay(day: number): ThemeDef {
  return THEMES[((day % THEMES.length) + THEMES.length) % THEMES.length];
}
