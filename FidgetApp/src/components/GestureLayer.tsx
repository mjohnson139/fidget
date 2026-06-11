import React, { useMemo, type ReactNode } from 'react';
import {
  Gesture,
  GestureDetector,
  type GestureTouchEvent,
  type TouchData,
} from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import type { FidgetEngine } from '../engine/physics';

/** kz above this on release counts as a spring-release snap (px). */
const RELEASE_SNAP_THRESHOLD = 20;

function twoFingerAngle(a: TouchData, b: TouchData): number {
  'worklet';
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function twoFingerDist(a: TouchData, b: TouchData): number {
  'worklet';
  return Math.hypot(b.x - a.x, b.y - a.y);
}

interface GestureLayerProps {
  engine: FidgetEngine;
  children: ReactNode;
}

/**
 * Ports prototype.html's touch handlers 1:1. A manual RNGH gesture receives
 * raw touches so the one-finger joystick, two-finger twist+pinch, and
 * mid-gesture 1↔2 finger transitions behave exactly like the prototype.
 * Every callback below is a worklet — no JS-thread work per touch event.
 */
export function GestureLayer({ engine, children }: GestureLayerProps) {
  // One-finger drag state
  const dragStartKx = useSharedValue(0);
  const dragStartKy = useSharedValue(0);
  const dragStartKz = useSharedValue(0);
  const dragStartPx = useSharedValue(0);
  const dragStartPy = useSharedValue(0);

  // Two-finger gesture state
  const gestureStartDist = useSharedValue(0);
  const gestureStartKz = useSharedValue(0);
  const lastGestureAngle = useSharedValue(0);

  const gesture = useMemo(() => {
    const { kx, ky, kz, target, userSpin, userSpinVel, mode, params, releaseEvent } = engine;

    const startOne = (x: number, y: number) => {
      'worklet';
      mode.value = 'one';
      target.value = { x: kx.value, y: ky.value, z: kz.value };
      dragStartKx.value = kx.value;
      dragStartKy.value = ky.value;
      dragStartKz.value = kz.value;
      dragStartPx.value = x;
      dragStartPy.value = y;
    };

    const startTwo = (a: TouchData, b: TouchData) => {
      'worklet';
      mode.value = 'two';
      target.value = null; // release the joystick target
      gestureStartDist.value = twoFingerDist(a, b);
      gestureStartKz.value = kz.value;
      lastGestureAngle.value = twoFingerAngle(a, b);
      userSpinVel.value = 0;
    };

    const updateOne = (x: number, y: number) => {
      'worklet';
      const p = params.value;
      const totalDx = x - dragStartPx.value;
      const totalDy = y - dragStartPy.value;
      let nx = dragStartKx.value + totalDx;
      let ny = dragStartKy.value + totalDy;
      const lateralDist = Math.hypot(nx, ny);
      let nz = dragStartKz.value;
      if (lateralDist > p.float) {
        const excess = lateralDist - p.float;
        if (totalDy < 0) {
          nz = Math.min(p.pull, dragStartKz.value + Math.min(excess, -totalDy * 0.8));
        }
        const k = p.float / lateralDist;
        nx *= k;
        ny *= k;
      } else if (totalDy < -10 && Math.abs(totalDx) < 30) {
        nz = Math.max(0, Math.min(p.pull, dragStartKz.value - totalDy));
      }
      target.value = { x: nx, y: ny, z: Math.max(0, nz) };
    };

    const updateTwo = (a: TouchData, b: TouchData) => {
      'worklet';
      const p = params.value;

      // Rotation: delta-from-last-event so fling velocity is reliable.
      const ang = twoFingerAngle(a, b);
      let dAng = ang - lastGestureAngle.value;
      if (dAng > Math.PI) dAng -= Math.PI * 2;
      if (dAng < -Math.PI) dAng += Math.PI * 2;
      userSpin.value += dAng * (180 / Math.PI);
      userSpinVel.value = dAng * (180 / Math.PI); // deg/frame
      lastGestureAngle.value = ang;

      // Spread: pinch out → extend, pinch in → collapse. 1px spread ≈ 1px pull.
      const distDelta = twoFingerDist(a, b) - gestureStartDist.value;
      const newKz = Math.max(0, Math.min(p.pull, gestureStartKz.value + distDelta));
      target.value = { x: kx.value, y: ky.value, z: newKz };
    };

    const endAll = () => {
      'worklet';
      if (mode.value !== 'idle' && kz.value > RELEASE_SNAP_THRESHOLD) {
        releaseEvent.value = releaseEvent.value + 1;
      }
      mode.value = 'idle';
      target.value = null;
    };

    return Gesture.Manual()
      .onTouchesDown((e: GestureTouchEvent, manager) => {
        'worklet';
        manager.activate();
        const touches = e.allTouches;
        if (touches.length >= 2) {
          startTwo(touches[0], touches[1]);
        } else if (touches.length === 1) {
          startOne(touches[0].x, touches[0].y);
        }
      })
      .onTouchesMove((e: GestureTouchEvent) => {
        'worklet';
        const touches = e.allTouches;
        if (touches.length >= 2) {
          if (mode.value !== 'two') startTwo(touches[0], touches[1]);
          else updateTwo(touches[0], touches[1]);
        } else if (touches.length === 1 && mode.value === 'one') {
          updateOne(touches[0].x, touches[0].y);
        } else if (touches.length === 1 && mode.value === 'two') {
          // One of two fingers lifted — settle into single-finger mode from
          // the remaining touch's current position.
          startOne(touches[0].x, touches[0].y);
        }
      })
      .onTouchesUp((e: GestureTouchEvent, manager) => {
        'worklet';
        const remaining = e.allTouches.filter(
          (t) => !e.changedTouches.some((c) => c.id === t.id),
        );
        if (remaining.length === 0) {
          endAll();
          manager.end();
        } else if (remaining.length === 1) {
          startOne(remaining[0].x, remaining[0].y);
        }
      })
      .onTouchesCancelled((_e: GestureTouchEvent, manager) => {
        'worklet';
        endAll();
        manager.end();
      });
  }, [
    engine,
    dragStartKx,
    dragStartKy,
    dragStartKz,
    dragStartPx,
    dragStartPy,
    gestureStartDist,
    gestureStartKz,
    lastGestureAngle,
  ]);

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
