import { bus, GameEvent } from '@/core/EventBus';
import { Profile } from '@/managers/ProfileStore';

/** Haptic feedback hook. Uses the Vibration API where available (mobile). */
export type HapticId = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticId, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [12, 30, 12],
  error: [40, 40, 40],
};

export function initHaptics(): void {
  bus.on(GameEvent.Haptic, (id: HapticId) => {
    if (!Profile.get().settings.haptics) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(PATTERNS[id]);
      } catch {
        /* not supported */
      }
    }
  });
}

export function haptic(id: HapticId): void {
  bus.emit(GameEvent.Haptic, id);
}
