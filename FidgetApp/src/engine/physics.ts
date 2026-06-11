import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { DEFAULT_PARAMS, type FidgetParams, type GestureMode } from './types';

export interface JoystickTarget {
  x: number;
  y: number;
  z: number;
}

/**
 * Everything the gesture layer, renderer, and tuner need to talk to the
 * physics worklet. All members are Reanimated shared values so no JS-bridge
 * crossing happens in the frame loop.
 */
export interface FidgetEngine {
  params: SharedValue<FidgetParams>;

  // Knob position relative to canvas center (kx, ky lateral; kz pull-up)
  kx: SharedValue<number>;
  ky: SharedValue<number>;
  kz: SharedValue<number>;

  // Joystick target while a gesture is active, null otherwise
  target: SharedValue<JoystickTarget | null>;

  // User-driven spin (degrees) + its per-frame velocity
  userSpin: SharedValue<number>;
  userSpinVel: SharedValue<number>;

  mode: SharedValue<GestureMode>;

  /** kz / pull, clamped to [0, 1] — updated every frame. */
  extension: SharedValue<number>;

  // ——— Sensory event channels (read by useAnimatedReaction on the JS side) ———
  /** Increments whenever extension crosses a click threshold. */
  clickEvent: SharedValue<number>;
  /** Increments when the joystick is released with kz above the snap threshold. */
  releaseEvent: SharedValue<number>;
}

const CLICK_THRESHOLDS = [0.2, 0.5, 0.8];
/** Spin momentum friction per frame, from the prototype. */
const SPIN_FRICTION = 0.96;

/**
 * Creates the engine state and runs the spring simulation on the UI thread.
 * This is a verbatim port of prototype.html's tick() physics, normalized to
 * a 60fps timestep so high-refresh-rate devices feel identical.
 */
export function usePhysicsEngine(initialParams: FidgetParams = DEFAULT_PARAMS): FidgetEngine {
  const params = useSharedValue<FidgetParams>(initialParams);

  const kx = useSharedValue(0);
  const ky = useSharedValue(0);
  const kz = useSharedValue(0);

  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const vz = useSharedValue(0);

  const target = useSharedValue<JoystickTarget | null>(null);

  const userSpin = useSharedValue(0);
  const userSpinVel = useSharedValue(0);

  const mode = useSharedValue<GestureMode>('idle');
  const extension = useSharedValue(0);

  const clickEvent = useSharedValue(0);
  const releaseEvent = useSharedValue(0);
  const prevExtension = useSharedValue(0);

  useFrameCallback((frame) => {
    'worklet';
    const p = params.value;

    // Normalize to the prototype's 60fps step; clamp so a long hitch can't
    // explode the integrator.
    const dtMs = frame.timeSincePreviousFrame ?? 16.667;
    const f = Math.min(2, Math.max(0.25, dtMs / 16.667));

    const stiff = p.spring;
    const dampF = Math.pow(p.damp, f);

    const t = target.value;
    if (t) {
      vx.value += (t.x - kx.value) * stiff * f;
      vy.value += (t.y - ky.value) * stiff * f;
      vz.value += (t.z - kz.value) * stiff * f;
    } else if (p.springBack) {
      vx.value += (0 - kx.value) * stiff * f;
      vy.value += (0 - ky.value) * stiff * f;
      vz.value += (0 - kz.value) * stiff * f;
    }
    vx.value *= dampF;
    vy.value *= dampF;
    vz.value *= dampF;
    kx.value += vx.value * f;
    ky.value += vy.value * f;
    kz.value += vz.value * f;

    // Spin momentum: when not actively twisting, keep coasting with friction.
    // No spring-back on rotation — the fidget keeps its orientation.
    if (mode.value !== 'two') {
      userSpin.value += userSpinVel.value * f;
      userSpinVel.value *= Math.pow(SPIN_FRICTION, f);
      if (Math.abs(userSpinVel.value) < 0.005) userSpinVel.value = 0;
    }

    const ext = Math.min(1, Math.max(0, kz.value / Math.max(1, p.pull)));
    extension.value = ext;

    // Ring-click events: fire when extension crosses a threshold in either
    // direction. The JS side rate-limits playback.
    const prev = prevExtension.value;
    for (let i = 0; i < CLICK_THRESHOLDS.length; i++) {
      const th = CLICK_THRESHOLDS[i];
      if ((prev < th && ext >= th) || (prev > th && ext <= th)) {
        clickEvent.value = clickEvent.value + 1;
        break;
      }
    }
    prevExtension.value = ext;
  });

  return {
    params,
    kx,
    ky,
    kz,
    target,
    userSpin,
    userSpinVel,
    mode,
    extension,
    clickEvent,
    releaseEvent,
  };
}
