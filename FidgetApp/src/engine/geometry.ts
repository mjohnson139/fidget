/**
 * Worklet-safe pure math, ported verbatim from prototype.html.
 * Every export is annotated 'worklet' so the physics/render worklets can
 * call them on the UI thread.
 */

/**
 * Metallic anodized gradient: purple at the outer edge into bright green at
 * the center, so the innermost rings stay in the highlight range.
 */
const STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0.0, [58, 45, 106]], // outer: deep purple
  [0.18, [45, 77, 138]], // blue
  [0.4, [45, 138, 168]], // teal
  [0.65, [78, 195, 184]], // cyan-green
  [0.85, [120, 220, 165]], // green
  [1.0, [160, 235, 180]], // innermost: bright pale green highlight
];

export function colorAt(t: number): [number, number, number] {
  'worklet';
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const t0 = STOPS[i][0];
    const c0 = STOPS[i][1];
    const t1 = STOPS[i + 1][0];
    const c1 = STOPS[i + 1][1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return [STOPS[0][1][0], STOPS[0][1][1], STOPS[0][1][2]];
}

export function rgbString(r: number, g: number, b: number): string {
  'worklet';
  return `rgb(${r},${g},${b})`;
}

/**
 * Star polygon vertices: points*2 alternating outer/inner radius, starting
 * straight up (-PI/2). Returns a flat [x0,y0,x1,y1,...] array to avoid
 * allocating nested arrays in the per-frame worklet.
 */
export function starVertices(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  rotationRad: number,
): number[] {
  'worklet';
  const verts: number[] = [];
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + rotationRad + (i / total) * Math.PI * 2;
    verts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return verts;
}

/** Outer radius of ring i of N, matching the prototype's spacing curve. */
export function ringRadius(
  i: number,
  ringCount: number,
  outer: number,
  min: number,
  play: number,
): number {
  'worklet';
  const t = ringCount > 1 ? i / (ringCount - 1) : 0;
  const tCurved = Math.pow(t, play);
  return outer - (outer - min) * tCurved;
}
