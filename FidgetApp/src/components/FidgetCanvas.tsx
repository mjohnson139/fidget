import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Oval,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { colorAt, ringRadius, rgbString, starVertices } from '../engine/geometry';
import type { FidgetEngine } from '../engine/physics';
import type { FidgetParams } from '../engine/types';

interface RingProps {
  engine: FidgetEngine;
  index: number;
  count: number;
  cx: number;
  cy: number;
  outlineDarkness: number;
}

/**
 * One concentric star ring. The path is rebuilt in a derived-value worklet
 * each time the physics state changes — this is the Skia-sanctioned pattern
 * for per-frame geometry.
 */
const Ring = React.memo(function Ring({
  engine,
  index,
  count,
  cx,
  cy,
  outlineDarkness,
}: RingProps) {
  const { params, kx, ky, userSpin, extension } = engine;
  const t = count > 1 ? index / (count - 1) : 0; // 0 outer (big) → 1 inner (small)

  const path = useDerivedValue(() => {
    const p = params.value;
    const ext = extension.value;

    const rOuter = ringRadius(index, count, p.outer, p.min, p.play);
    const rInner = rOuter * p.ratio;

    // Inner rings (t→1) follow the knob most, outer rings barely move.
    const follow = p.follow * Math.pow(t, p.falloff);
    const ox = kx.value * follow;
    const oy = ky.value * follow;

    // When extended, lift each ring (cone view).
    const liftY = -t * (ext * p.outer * 0.85);

    const twistDeg = p.twistExtendedOnly ? p.twist * ext : p.twist;
    const ringTwistRad = ((index * twistDeg + userSpin.value) * Math.PI) / 180;

    const verts = starVertices(cx + ox, cy + oy + liftY, rOuter, rInner, p.points, ringTwistRad);
    const sk = Skia.Path.Make();
    sk.moveTo(verts[0], verts[1]);
    for (let v = 2; v < verts.length; v += 2) sk.lineTo(verts[v], verts[v + 1]);
    sk.close();
    return sk;
  });

  const [r, g, b] = colorAt(t);
  const fill = rgbString(r, g, b);
  const stroke = rgbString(
    Math.max(0, r - outlineDarkness),
    Math.max(0, g - outlineDarkness),
    Math.max(0, b - outlineDarkness),
  );

  return (
    <>
      <Path path={path} color={fill} style="fill" />
      {outlineDarkness > 0 && (
        <Path path={path} color={stroke} style="stroke" strokeWidth={1} />
      )}
    </>
  );
});

interface FidgetCanvasProps {
  engine: FidgetEngine;
  width: number;
  height: number;
  /** React-side copy of params for static geometry (ring count, radii). */
  uiParams: FidgetParams;
}

/**
 * The full fidget scene: arena background, contact shadow, ring stack, and
 * float-boundary guide. Everything dynamic reads shared values directly so
 * the frame loop never touches the JS thread.
 */
export function FidgetCanvas({ engine, width, height, uiParams }: FidgetCanvasProps) {
  const cx = width / 2;
  const cy = height / 2;
  const { kx, ky, extension, mode } = engine;

  const ringCount = Math.max(2, Math.round(uiParams.rings));
  const ringIndices = useMemo(() => Array.from({ length: ringCount }, (_, i) => i), [ringCount]);

  // Contact shadow fades as the stack lifts.
  const shadowOpacity = useDerivedValue(() => {
    return (0.55 - extension.value * 0.25) / 0.55;
  });
  const shadowR = uiParams.outer * 0.95;

  // Float boundary guide appears while the joystick is engaged or displaced.
  const guideOpacity = useDerivedValue(() => {
    const active = mode.value === 'one' || Math.hypot(kx.value, ky.value) > 2;
    return active ? 1 : 0;
  });

  if (width <= 0 || height <= 0) return null;

  return (
    <Canvas style={{ width, height }}>
      {/* Arena background glow */}
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(cx, height * 0.4)}
          r={Math.max(width, height) * 0.75}
          colors={['#1a1230', '#0d0820', '#050210']}
          positions={[0, 0.7, 1]}
        />
      </Rect>

      {/* Contact shadow */}
      <Group opacity={shadowOpacity}>
        <Oval
          x={cx - shadowR}
          y={cy + 8 - shadowR * 0.32}
          width={shadowR * 2}
          height={shadowR * 0.64}
        >
          <RadialGradient
            c={vec(cx, cy + 6)}
            r={shadowR}
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
          />
        </Oval>
      </Group>

      {/* Concentric star rings, outer → inner */}
      {ringIndices.map((i) => (
        <Ring
          key={i}
          engine={engine}
          index={i}
          count={ringCount}
          cx={cx}
          cy={cy}
          outlineDarkness={uiParams.outline}
        />
      ))}

      {/* Float boundary guide */}
      <Group opacity={guideOpacity}>
        <Circle
          c={vec(cx, cy)}
          r={uiParams.float}
          color="rgba(140, 110, 200, 0.18)"
          style="stroke"
          strokeWidth={1}
        >
          <DashPathEffect intervals={[4, 6]} />
        </Circle>
      </Group>
    </Canvas>
  );
}
