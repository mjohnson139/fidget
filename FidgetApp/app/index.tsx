import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAudioEngine } from '../src/audio/useAudioEngine';
import { FidgetCanvas } from '../src/components/FidgetCanvas';
import { GestureLayer } from '../src/components/GestureLayer';
import { TunerPanel } from '../src/components/TunerPanel';
import { usePhysicsEngine } from '../src/engine/physics';
import {
  DEFAULT_PARAMS,
  type FidgetParams,
  type NumericParamKey,
  type PresetParams,
  type UserPreset,
} from '../src/engine/types';
import { useHapticEngine } from '../src/haptics/useHapticEngine';
import {
  loadSavedParams,
  loadUserPresets,
  saveParams,
  saveUserPresets,
} from '../src/store/presets';

const PRESET_TWEEN_MS = 250;
const PRESET_TWEEN_STEPS = 8;
const PARAM_PERSIST_DEBOUNCE_MS = 600;

export default function FidgetScreen() {
  const insets = useSafeAreaInsets();
  const engine = usePhysicsEngine();
  const audio = useAudioEngine();
  const haptics = useHapticEngine();

  const [uiParams, setUiParams] = useState<FidgetParams>(DEFAULT_PARAMS);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tweenTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Single write path: update React state and the physics shared value together. */
  const applyParams = useCallback(
    (updater: (prev: FidgetParams) => FidgetParams) => {
      setUiParams((prev) => {
        const next = updater(prev);
        engine.params.value = next;
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => void saveParams(next), PARAM_PERSIST_DEBOUNCE_MS);
        return next;
      });
    },
    [engine.params],
  );

  // Restore last-used params and user presets on launch.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [saved, presets] = await Promise.all([loadSavedParams(), loadUserPresets()]);
      if (!alive) return;
      setUiParams(saved);
      engine.params.value = saved;
      setUserPresets(presets);
    })();
    return () => {
      alive = false;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      if (tweenTimer.current) clearInterval(tweenTimer.current);
    };
  }, [engine.params]);

  // Keep the sensory engines in sync with the toggles.
  useEffect(() => {
    audio.setEnabled(uiParams.soundEnabled);
  }, [audio, uiParams.soundEnabled]);
  useEffect(() => {
    haptics.setEnabled(uiParams.hapticsEnabled);
  }, [haptics, uiParams.hapticsEnabled]);

  // ——— Physics → sensory bridges (the only sanctioned runOnJS crossings) ———
  const playClick = useCallback(() => {
    audio.playClick();
    haptics.impactLight();
  }, [audio, haptics]);

  const playRelease = useCallback(() => {
    audio.playRelease();
    haptics.impactMedium();
  }, [audio, haptics]);

  const onGestureStart = useCallback(() => {
    haptics.selection();
  }, [haptics]);

  const setWhoosh = useCallback(
    (level: number) => {
      audio.setWhooshLevel(level);
    },
    [audio],
  );

  useAnimatedReaction(
    () => engine.clickEvent.value,
    (current, previous) => {
      if (previous !== null && current !== previous) runOnJS(playClick)();
    },
    [playClick],
  );

  useAnimatedReaction(
    () => engine.releaseEvent.value,
    (current, previous) => {
      if (previous !== null && current !== previous) runOnJS(playRelease)();
    },
    [playRelease],
  );

  useAnimatedReaction(
    () => engine.mode.value,
    (current, previous) => {
      if (previous !== null && previous === 'idle' && current !== 'idle') {
        runOnJS(onGestureStart)();
      }
    },
    [onGestureStart],
  );

  // Whoosh volume follows spin speed. Quantized in the worklet so runOnJS
  // only fires when the audible level actually changes.
  const whooshBucket = useSharedValue(0);
  useAnimatedReaction(
    () => {
      const speed = Math.abs(engine.userSpinVel.value);
      return Math.round(speed / 2.5) * 2.5;
    },
    (current) => {
      if (current !== whooshBucket.value) {
        whooshBucket.value = current;
        runOnJS(setWhoosh)(current);
      }
    },
    [setWhoosh],
  );

  // ——— Tuner callbacks ———
  const handleSetParam = useCallback(
    (key: NumericParamKey, value: number) => {
      applyParams((prev) => ({ ...prev, [key]: value }));
    },
    [applyParams],
  );

  const handleSetToggle = useCallback(
    (
      key: 'springBack' | 'twistExtendedOnly' | 'soundEnabled' | 'hapticsEnabled',
      value: boolean,
    ) => {
      applyParams((prev) => ({ ...prev, [key]: value }));
    },
    [applyParams],
  );

  /** Smoothly animate numeric params to a preset instead of snapping. */
  const handleLoadPreset = useCallback(
    (preset: PresetParams) => {
      if (tweenTimer.current) clearInterval(tweenTimer.current);
      const from = { ...engine.params.value };
      const keys = Object.keys(preset) as NumericParamKey[];
      let step = 0;
      tweenTimer.current = setInterval(() => {
        step += 1;
        const raw = step / PRESET_TWEEN_STEPS;
        const eased = 1 - Math.pow(1 - raw, 3);
        applyParams((prev) => {
          const next = { ...prev };
          for (const k of keys) {
            const targetValue = preset[k];
            if (typeof targetValue === 'number') {
              next[k] = from[k] + (targetValue - from[k]) * eased;
            }
          }
          return next;
        });
        if (step >= PRESET_TWEEN_STEPS && tweenTimer.current) {
          clearInterval(tweenTimer.current);
          tweenTimer.current = null;
        }
      }, PRESET_TWEEN_MS / PRESET_TWEEN_STEPS);
    },
    [applyParams, engine.params],
  );

  const handleSaveUserPreset = useCallback(
    (name: string) => {
      setUserPresets((prev) => {
        const p = engine.params.value;
        const snapshot: PresetParams = {
          float: p.float,
          pull: p.pull,
          follow: p.follow,
          falloff: p.falloff,
          spring: p.spring,
          damp: p.damp,
          points: p.points,
          ratio: p.ratio,
          rings: p.rings,
          outer: p.outer,
          min: p.min,
          play: p.play,
          twist: p.twist,
          outline: p.outline,
        };
        const next = [...prev.filter((u) => u.name !== name), { name, params: snapshot }];
        void saveUserPresets(next);
        return next;
      });
    },
    [engine.params],
  );

  const handleDeleteUserPreset = useCallback((name: string) => {
    setUserPresets((prev) => {
      const next = prev.filter((u) => u.name !== name);
      void saveUserPresets(next);
      return next;
    });
  }, []);

  return (
    <View style={styles.screen}>
      <GestureLayer engine={engine}>
        <View
          style={styles.arena}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setCanvasSize({ width, height });
          }}
        >
          <FidgetCanvas
            engine={engine}
            width={canvasSize.width}
            height={canvasSize.height}
            uiParams={uiParams}
          />
        </View>
      </GestureLayer>

      <View style={[styles.hint, { bottom: insets.bottom + 14 }]} pointerEvents="none">
        <Text style={styles.hintText}>
          one finger to push · <Text style={styles.hintStrong}>two fingers to twist</Text> · pinch
          out to extend
        </Text>
      </View>

      <View style={[styles.overlay, { top: insets.top }]} pointerEvents="box-none">
        <TunerPanel
          params={uiParams}
          onSetParam={handleSetParam}
          onSetToggle={handleSetToggle}
          onLoadPreset={handleLoadPreset}
          userPresets={userPresets}
          onSaveUserPreset={handleSaveUserPreset}
          onDeleteUserPreset={handleDeleteUserPreset}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0612' },
  arena: { flex: 1 },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(212, 204, 224, 0.55)',
    textAlign: 'center',
  },
  hintStrong: { color: '#6dd9a0', fontWeight: '500' },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
