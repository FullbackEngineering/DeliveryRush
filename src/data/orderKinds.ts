import { Palette } from '@/core/Palette';

/** Order flavors. `emoji` renders the marker/HUD glyph; `color` tints the marker. */
export interface OrderKind {
  id: string;
  label: string;
  emoji: string;
  color: number;
}

export const ORDER_KINDS: OrderKind[] = [
  { id: 'pizza', label: 'Pizza', emoji: '🍕', color: Palette.orange },
  { id: 'coffee', label: 'Coffee', emoji: '☕', color: 0xc08457 },
  { id: 'burger', label: 'Burger', emoji: '🍔', color: 0xe0a33a },
  { id: 'sushi', label: 'Sushi', emoji: '🍣', color: 0xef6f7b },
  { id: 'parcel', label: 'Parcel', emoji: '📦', color: Palette.blue },
];
