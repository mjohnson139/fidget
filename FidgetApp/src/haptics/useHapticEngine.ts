import * as Haptics from 'expo-haptics';
import { useMemo, useRef } from 'react';
import { Platform } from 'react-native';

/** Minimum gap between impact pulses. */
const IMPACT_RATE_LIMIT_MS = 60;

export interface HapticEngine {
  /** Light tap — ring click. */
  impactLight(): void;
  /** Medium pulse — spring release / snap-back. */
  impactMedium(): void;
  /** Selection tick — gesture start. */
  selection(): void;
  /** Master switch, mirrors params.hapticsEnabled. */
  setEnabled(enabled: boolean): void;
}

/**
 * Wraps expo-haptics with rate limiting and a master switch. Gracefully
 * inert on Web (no haptics API) and on devices without a haptic motor —
 * expo-haptics calls resolve silently there.
 */
export function useHapticEngine(): HapticEngine {
  const enabled = useRef(true);
  const lastImpactAt = useRef(0);
  const supported = Platform.OS !== 'web';

  return useMemo<HapticEngine>(() => {
    const fire = (fn: () => Promise<void>) => {
      if (!enabled.current || !supported) return;
      const now = Date.now();
      if (now - lastImpactAt.current < IMPACT_RATE_LIMIT_MS) return;
      lastImpactAt.current = now;
      fn().catch(() => {
        // Device without a haptic motor — ignore.
      });
    };
    return {
      impactLight() {
        fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      },
      impactMedium() {
        fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      },
      selection() {
        fire(() => Haptics.selectionAsync());
      },
      setEnabled(value: boolean) {
        enabled.current = value;
      },
    };
  }, [supported]);
}
