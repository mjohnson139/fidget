import Slider from '@react-native-community/slider';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  BUILT_IN_PRESETS,
  MAX_USER_PRESETS,
  type FidgetParams,
  type NumericParamKey,
  type PresetParams,
  type UserPreset,
} from '../engine/types';

const PANEL_WIDTH = 300;

interface SliderSpec {
  key: NumericParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
}

const int = (v: number) => String(Math.round(v));
const dec2 = (v: number) => v.toFixed(2);

const JOYSTICK_SLIDERS: SliderSpec[] = [
  { key: 'float', label: 'float radius (lateral)', min: 0, max: 160, step: 2, fmt: int },
  { key: 'pull', label: 'max pull-up (vertical)', min: 20, max: 220, step: 2, fmt: int },
  { key: 'follow', label: 'ring follow strength', min: 0, max: 1.2, step: 0.02, fmt: dec2 },
  { key: 'falloff', label: 'follow falloff', min: 0.2, max: 3, step: 0.05, fmt: dec2 },
  { key: 'spring', label: 'spring stiffness', min: 0.02, max: 0.5, step: 0.01, fmt: dec2 },
  { key: 'damp', label: 'damping', min: 0.5, max: 0.98, step: 0.01, fmt: dec2 },
];

const SHAPE_SLIDERS: SliderSpec[] = [
  { key: 'points', label: 'points', min: 3, max: 20, step: 1, fmt: int },
  { key: 'ratio', label: 'inner ratio', min: 0.4, max: 1, step: 0.01, fmt: dec2 },
  { key: 'rings', label: 'rings', min: 6, max: 60, step: 1, fmt: int },
  { key: 'outer', label: 'outer radius', min: 80, max: 260, step: 2, fmt: int },
  { key: 'min', label: 'min radius', min: 4, max: 80, step: 1, fmt: int },
  { key: 'play', label: 'spacing play', min: 0.4, max: 2, step: 0.02, fmt: dec2 },
];

const MOTION_SLIDERS: SliderSpec[] = [
  { key: 'twist', label: 'twist when extended', min: 0, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(2)}°/ring` },
];

const RENDER_SLIDERS: SliderSpec[] = [
  { key: 'outline', label: 'outline darkness', min: 0, max: 120, step: 2, fmt: int },
];

interface TunerPanelProps {
  params: FidgetParams;
  onSetParam: (key: NumericParamKey, value: number) => void;
  onSetToggle: (
    key: 'springBack' | 'twistExtendedOnly' | 'soundEnabled' | 'hapticsEnabled',
    value: boolean,
  ) => void;
  onLoadPreset: (preset: PresetParams) => void;
  userPresets: UserPreset[];
  onSaveUserPreset: (name: string) => void;
  onDeleteUserPreset: (name: string) => void;
}

const SliderRow = React.memo(function SliderRow({
  spec,
  value,
  onSetParam,
}: {
  spec: SliderSpec;
  value: number;
  onSetParam: (key: NumericParamKey, value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={styles.labelText}>{spec.label}</Text>
        <Text style={styles.valueText}>{spec.fmt(value)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={spec.min}
        maximumValue={spec.max}
        step={spec.step}
        value={value}
        onValueChange={(v: number) => onSetParam(spec.key, v)}
        minimumTrackTintColor="#6dd9a0"
        maximumTrackTintColor="#2a1f44"
        thumbTintColor="#6dd9a0"
      />
    </View>
  );
});

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.labelText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#2a1f44', true: 'rgba(109, 217, 160, 0.3)' }}
        thumbColor={value ? '#6dd9a0' : '#8a7aa8'}
      />
    </View>
  );
}

/**
 * The floating settings panel from the prototype: draggable via the title
 * bar, collapsible to the title bar, hideable behind a wrench button.
 * Slider changes propagate to the physics worklet through shared values
 * (wired up by the screen via onSetParam).
 */
export function TunerPanel(props: TunerPanelProps) {
  const { params, onSetParam, onSetToggle, onLoadPreset, userPresets } = props;
  const window = useWindowDimensions();

  const [hidden, setHidden] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Panel drag — title bar only, clamped to the viewport.
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          startX.value = tx.value;
          startY.value = ty.value;
        })
        .onUpdate((e) => {
          // Panel is anchored top-right at (16,16); translation is relative.
          const minX = -(window.width - PANEL_WIDTH - 32);
          const maxY = window.height - 76;
          tx.value = Math.min(0, Math.max(minX, startX.value + e.translationX));
          ty.value = Math.min(maxY, Math.max(0, startY.value + e.translationY));
        }),
    [startX, startY, tx, ty, window.width, window.height],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  if (hidden) {
    return (
      <Pressable
        style={styles.wrenchButton}
        onPress={() => setHidden(false)}
        accessibilityLabel="Show tuner"
      >
        <Text style={styles.wrenchIcon}>🔧</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.panel, { maxHeight: window.height - 32 }, panelStyle]}>
      <GestureDetector gesture={dragGesture}>
        <View style={styles.titlebar}>
          <Text style={styles.title}>⋮⋮ Tuner</Text>
          <Pressable
            style={styles.panelBtn}
            onPress={() => setCollapsed((c) => !c)}
            accessibilityLabel={collapsed ? 'Expand' : 'Collapse'}
          >
            <Text style={styles.panelBtnText}>{collapsed ? '▢' : '—'}</Text>
          </Pressable>
          <Pressable
            style={styles.panelBtn}
            onPress={() => setHidden(true)}
            accessibilityLabel="Hide tuner"
          >
            <Text style={styles.panelBtnText}>✕</Text>
          </Pressable>
        </View>
      </GestureDetector>

      {!collapsed && (
        <Animated.ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.sub}>handle is a 2D joystick · rings respond as it moves</Text>

          <Text style={styles.section}>Joystick</Text>
          {JOYSTICK_SLIDERS.map((s) => (
            <SliderRow key={s.key} spec={s} value={params[s.key]} onSetParam={onSetParam} />
          ))}
          <ToggleRow
            label="spring back when released"
            value={params.springBack}
            onChange={(v) => onSetToggle('springBack', v)}
          />

          <Text style={styles.section}>Shape</Text>
          {SHAPE_SLIDERS.map((s) => (
            <SliderRow key={s.key} spec={s} value={params[s.key]} onSetParam={onSetParam} />
          ))}

          <Text style={styles.section}>Motion</Text>
          {MOTION_SLIDERS.map((s) => (
            <SliderRow key={s.key} spec={s} value={params[s.key]} onSetParam={onSetParam} />
          ))}
          <ToggleRow
            label="twist only when extended"
            value={params.twistExtendedOnly}
            onChange={(v) => onSetToggle('twistExtendedOnly', v)}
          />

          <Text style={styles.section}>Render</Text>
          {RENDER_SLIDERS.map((s) => (
            <SliderRow key={s.key} spec={s} value={params[s.key]} onSetParam={onSetParam} />
          ))}

          <Text style={styles.section}>Sound & Haptics</Text>
          <ToggleRow
            label="sound"
            value={params.soundEnabled}
            onChange={(v) => onSetToggle('soundEnabled', v)}
          />
          <ToggleRow
            label="haptics"
            value={params.hapticsEnabled}
            onChange={(v) => onSetToggle('hapticsEnabled', v)}
          />

          <Text style={styles.section}>Presets</Text>
          <View style={styles.presetGrid}>
            {BUILT_IN_PRESETS.map((p) => (
              <Pressable
                key={p.key}
                style={styles.presetBtn}
                onPress={() => onLoadPreset(p.params)}
              >
                <Text style={styles.presetBtnText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          {userPresets.length > 0 && (
            <View style={styles.presetGrid}>
              {userPresets.map((p) => (
                <View key={p.name} style={styles.userPresetWrap}>
                  <Pressable
                    style={[styles.presetBtn, styles.userPresetBtn]}
                    onPress={() => onLoadPreset(p.params)}
                  >
                    <Text style={styles.presetBtnText} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => props.onDeleteUserPreset(p.name)}
                    accessibilityLabel={`Delete preset ${p.name}`}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {userPresets.length < MAX_USER_PRESETS && (
            <View style={styles.saveRow}>
              <TextInput
                style={styles.nameInput}
                placeholder="preset name"
                placeholderTextColor="#6a5d80"
                value={presetName}
                onChangeText={setPresetName}
                maxLength={24}
              />
              <Pressable
                style={[styles.presetBtn, styles.saveBtn]}
                onPress={() => {
                  const name = presetName.trim();
                  if (!name) return;
                  props.onSaveUserPreset(name);
                  setPresetName('');
                }}
              >
                <Text style={styles.presetBtnText}>Save</Text>
              </Pressable>
            </View>
          )}
        </Animated.ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: PANEL_WIDTH,
    backgroundColor: 'rgba(16, 10, 31, 0.94)',
    borderColor: 'rgba(140, 110, 200, 0.22)',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 25,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  titlebar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    backgroundColor: 'rgba(50, 35, 80, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(140, 110, 200, 0.18)',
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#d4cce0',
    letterSpacing: 0.5,
  },
  panelBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  panelBtnText: { color: '#b8acd0', fontSize: 12 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  sub: { fontSize: 11, color: '#6a5d80', marginBottom: 6 },
  section: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#8a7aa8',
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 10,
  },
  row: { marginBottom: 14 },
  rowLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  labelText: { fontSize: 12, color: '#b8acd0' },
  valueText: { fontSize: 11, color: '#6dd9a0', fontVariant: ['tabular-nums'] },
  slider: { width: '100%', height: 28 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  presetBtn: {
    backgroundColor: '#1a1230',
    borderColor: '#2a1f44',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 124,
    alignItems: 'center',
  },
  presetBtnText: { color: '#b8acd0', fontSize: 11 },
  userPresetWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userPresetBtn: { minWidth: 96 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { color: '#8a7aa8', fontSize: 11 },
  saveRow: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' },
  nameInput: {
    flex: 1,
    backgroundColor: '#1a1230',
    borderColor: '#2a1f44',
    borderWidth: 1,
    borderRadius: 6,
    color: '#d4cce0',
    fontSize: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  saveBtn: { minWidth: 64 },
  wrenchButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 10, 36, 0.78)',
    borderColor: 'rgba(140, 110, 200, 0.25)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 12,
  },
  wrenchIcon: { fontSize: 18 },
});
