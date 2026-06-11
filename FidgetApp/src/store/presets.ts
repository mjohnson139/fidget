import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_PARAMS,
  MAX_USER_PRESETS,
  type FidgetParams,
  type UserPreset,
} from '../engine/types';

const PRESETS_KEY = 'fidget_presets';
const PARAMS_KEY = 'fidget_params';

export async function loadUserPresets(): Promise<UserPreset[]> {
  try {
    const raw = await AsyncStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is UserPreset =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as UserPreset).name === 'string' &&
        typeof (p as UserPreset).params === 'object',
    );
  } catch {
    return [];
  }
}

export async function saveUserPresets(presets: UserPreset[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(presets.slice(0, MAX_USER_PRESETS)));
  } catch {
    // Persistence is best-effort; the toy keeps working without it.
  }
}

/**
 * Restores the last-used params, merged over defaults so new params added in
 * later versions pick up their default values.
 */
export async function loadSavedParams(): Promise<FidgetParams> {
  try {
    const raw = await AsyncStorage.getItem(PARAMS_KEY);
    if (!raw) return DEFAULT_PARAMS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PARAMS;
    return { ...DEFAULT_PARAMS, ...(parsed as Partial<FidgetParams>) };
  } catch {
    return DEFAULT_PARAMS;
  }
}

export async function saveParams(params: FidgetParams): Promise<void> {
  try {
    await AsyncStorage.setItem(PARAMS_KEY, JSON.stringify(params));
  } catch {
    // Best-effort.
  }
}
