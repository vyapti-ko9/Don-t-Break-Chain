// Haptics with a graceful fallback chain:
//   Capacitor Haptics plugin  ->  navigator.vibrate  ->  no-op
// Never throws, never blocks gameplay.

import { getSettings } from './storage';

type Style = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

let capHaptics:
  | {
      impact: (o: { style: string }) => Promise<void>;
      notification: (o: { type: string }) => Promise<void>;
      vibrate: (o: { duration: number }) => Promise<void>;
    }
  | null
  | undefined;

async function loadCap() {
  if (capHaptics !== undefined) return capHaptics;
  try {
    const mod = await import('@capacitor/haptics');
    capHaptics = mod.Haptics as unknown as NonNullable<typeof capHaptics>;
  } catch {
    capHaptics = null;
  }
  return capHaptics;
}

function webVibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function haptic(style: Style = 'light'): void {
  if (!getSettings().haptics) return;
  loadCap()
    .then((h) => {
      if (h) {
        if (style === 'success' || style === 'warning' || style === 'error') {
          void h.notification({ type: style.toUpperCase() });
        } else {
          void h.impact({ style: style.toUpperCase() });
        }
        return;
      }
      const map: Record<Style, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 35,
        success: [0, 20, 40, 30],
        warning: [0, 30, 40, 30],
        error: [0, 50, 30, 50],
      };
      webVibrate(map[style]);
    })
    .catch(() => {
      /* ignore */
    });
}
