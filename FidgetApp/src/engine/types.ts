/**
 * All physics and shape parameters for the fidget. Mirrors the `params`
 * object in prototype.html — ranges and defaults must match the prototype.
 */
export interface FidgetParams {
  // Joystick
  float: number; // 0–160, default 60 — lateral float radius (px)
  pull: number; // 20–220, default 110 — max vertical extension (px)
  follow: number; // 0–1.2, default 0.55 — ring follow strength
  falloff: number; // 0.2–3, default 1.40 — follow falloff exponent
  spring: number; // 0.02–0.5, default 0.18 — spring stiffness
  damp: number; // 0.5–0.98, default 0.78 — velocity damping
  springBack: boolean; // default true

  // Shape
  points: number; // 3–20, default 10 — star points
  ratio: number; // 0.4–1, default 0.78 — inner/outer radius ratio
  rings: number; // 6–60, default 28 — concentric ring count
  outer: number; // 80–260, default 170 — outermost ring radius (px)
  min: number; // 4–80, default 22 — innermost ring radius (px)
  play: number; // 0.4–2, default 1.10 — ring spacing curve exponent

  // Motion
  twist: number; // 0–3, default 0.8 — degrees twist per ring
  twistExtendedOnly: boolean; // default true

  // Render
  outline: number; // 0–120, default 60 — outline darkness offset

  // Sensory
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

/** Numeric param keys that sliders / presets operate on. */
export type NumericParamKey =
  | 'float'
  | 'pull'
  | 'follow'
  | 'falloff'
  | 'spring'
  | 'damp'
  | 'points'
  | 'ratio'
  | 'rings'
  | 'outer'
  | 'min'
  | 'play'
  | 'twist'
  | 'outline';

export const DEFAULT_PARAMS: FidgetParams = {
  float: 60,
  pull: 110,
  follow: 0.55,
  falloff: 1.4,
  spring: 0.18,
  damp: 0.78,
  springBack: true,

  points: 10,
  ratio: 0.78,
  rings: 28,
  outer: 170,
  min: 22,
  play: 1.1,

  twist: 0.8,
  twistExtendedOnly: true,

  outline: 60,

  soundEnabled: true,
  hapticsEnabled: true,
};

/** A preset only overrides the joystick feel, like the prototype. */
export type PresetParams = Partial<Pick<FidgetParams, NumericParamKey>>;

export interface BuiltInPreset {
  key: string;
  label: string;
  params: PresetParams;
}

export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    key: 'default',
    label: 'Default',
    params: { float: 60, pull: 110, follow: 0.55, falloff: 1.4, spring: 0.18, damp: 0.78 },
  },
  {
    key: 'loose',
    label: 'Loose float',
    params: { float: 130, pull: 180, follow: 0.75, falloff: 1.1, spring: 0.1, damp: 0.85 },
  },
  {
    key: 'taut',
    label: 'Taut spring',
    params: { float: 35, pull: 70, follow: 0.4, falloff: 2.0, spring: 0.32, damp: 0.65 },
  },
  {
    key: 'floaty',
    label: 'Floaty',
    params: { float: 90, pull: 140, follow: 0.65, falloff: 0.9, spring: 0.06, damp: 0.92 },
  },
];

export interface UserPreset {
  name: string;
  params: PresetParams;
}

export const MAX_USER_PRESETS = 20;

/** Gesture interaction mode, mirrors prototype's `mode` variable. */
export type GestureMode = 'idle' | 'one' | 'two';
