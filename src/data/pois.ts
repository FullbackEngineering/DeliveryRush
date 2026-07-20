import { Palette } from '@/core/Palette';
import { PoiType } from '@/types';

/**
 * Named POI venues placed around SERBEST by `PoiSystem` (`world/Pois.ts`).
 * Sources (`isSource: true`) are where jobs pick up (restaurant/cafe/cargo);
 * the rest are drop-off destinations (home/office).
 */
export interface PoiDef {
  type: PoiType;
  name: string;
  emoji: string;
  color: number;
  isSource: boolean;
}

export const POI_DEFS: PoiDef[] = [
  // --- Pickup sources ---
  { type: 'restaurant', name: 'Pizza Sarayı', emoji: '🍕', color: Palette.orange, isSource: true },
  { type: 'restaurant', name: 'Burger Dükkanı', emoji: '🍔', color: 0xe0a33a, isSource: true },
  { type: 'restaurant', name: 'Suşi Bar', emoji: '🍣', color: 0xef6f7b, isSource: true },
  { type: 'cafe', name: 'Kahve Köşesi', emoji: '☕', color: 0xc08457, isSource: true },
  { type: 'cafe', name: 'Büfe 7/24', emoji: '🥤', color: Palette.cyan, isSource: true },
  { type: 'cargo', name: 'Hızlı Kargo', emoji: '📦', color: Palette.blue, isSource: true },
  { type: 'cargo', name: 'Depo No.3', emoji: '📦', color: Palette.purple, isSource: true },
  // --- Drop-off destinations ---
  { type: 'home', name: 'Vadi Evleri', emoji: '🏠', color: Palette.green, isSource: false },
  { type: 'home', name: 'Park Sitesi', emoji: '🏠', color: 0x5aa9ff, isSource: false },
  { type: 'home', name: 'Güneş Apartmanı', emoji: '🏠', color: Palette.gold, isSource: false },
  { type: 'office', name: 'Merkez Plaza', emoji: '🏢', color: 0x94a3b8, isSource: false },
  { type: 'office', name: 'Liman Ofis', emoji: '🏢', color: Palette.cyan, isSource: false },
];
