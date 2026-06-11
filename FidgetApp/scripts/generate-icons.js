/* eslint-disable */
// Generates app icons, adaptive icons, splash, and favicon in assets/.
// Run: node scripts/generate-icons.js
// Renders the fidget's concentric star rings (at rest) with the same
// geometry and gradient as the app, using a built-in PNG encoder.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');

// ——— Star geometry (matches src/engine/geometry.ts at rest) ———
const POINTS = 10;
const RATIO = 0.78;
const RINGS = 28;
const PLAY = 1.1;

const STOPS = [
  [0.0, [58, 45, 106]],
  [0.18, [45, 77, 138]],
  [0.4, [45, 138, 168]],
  [0.65, [78, 195, 184]],
  [0.85, [120, 220, 165]],
  [1.0, [160, 235, 180]],
];

function colorAt(t) {
  t = ((t % 1) + 1) % 1;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ];
    }
  }
  return STOPS[0][1];
}

// Unit star radial profile: boundary radius (outer=1, inner=RATIO) along
// angle phi, where vertex 0 (outer) sits at phi=0.
const STEP = Math.PI / POINTS; // angle between adjacent vertices
function starProfile(phi) {
  phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const seg = Math.floor(phi / STEP);
  const a0 = seg * STEP;
  const a1 = a0 + STEP;
  const r0 = seg % 2 === 0 ? 1 : RATIO;
  const r1 = seg % 2 === 0 ? RATIO : 1;
  // Polar form of the straight edge between (r0,a0) and (r1,a1)
  return (r0 * r1 * Math.sin(a1 - a0)) / (r1 * Math.sin(a1 - phi) + r0 * Math.sin(phi - a0));
}

function ringOuterRadius(i, outer, min) {
  const t = i / (RINGS - 1);
  return outer - (outer - min) * Math.pow(t, PLAY);
}

/**
 * Returns [r,g,b,a] (0–255) for one sample point.
 * mode: 'icon' (dark bg), 'transparent' (star only), 'mono' (white silhouette)
 */
function sample(x, y, size, outer, min, mode) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  const theta = Math.atan2(dy, dx);
  const phi = theta + Math.PI / 2; // vertex 0 points up
  const f = starProfile(phi);
  const rNeeded = dist / f;

  let bg = [0, 0, 0, 0];
  if (mode === 'icon') {
    // Radial dark-purple glow like the in-app arena
    const g = Math.min(1, dist / (size * 0.7));
    const mix = (a, b, t) => a + (b - a) * t;
    bg = [
      Math.round(mix(26, 5, g)),
      Math.round(mix(18, 2, g)),
      Math.round(mix(48, 16, g)),
      255,
    ];
  }

  if (rNeeded > outer) return bg;

  if (mode === 'mono') return [255, 255, 255, 255];

  const tStar = Math.pow((outer - rNeeded) / (outer - min), 1 / PLAY);
  let i = Math.floor(tStar * (RINGS - 1));
  if (rNeeded < min) i = RINGS - 1;
  i = Math.max(0, Math.min(RINGS - 1, i));
  const tRing = i / (RINGS - 1);
  let [r, g, b] = colorAt(tRing);

  // Outline: darken near the containing ring's outer edge
  const edge = ringOuterRadius(i, outer, min) * f;
  const edgePx = Math.max(1, size / 512);
  if (edge - dist < edgePx) {
    r = Math.max(0, r - 60);
    g = Math.max(0, g - 60);
    b = Math.max(0, b - 60);
  }
  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

function render(size, outerFrac, mode) {
  const outer = size * outerFrac;
  const min = outer * (22 / 170); // same min/outer proportion as defaults
  const px = Buffer.alloc(size * size * 4);
  const SS = 2; // 2x2 supersampling
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, outer, min, mode);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      px[o] = Math.round(r / n);
      px[o + 1] = Math.round(g / n);
      px[o + 2] = Math.round(b / n);
      px[o + 3] = Math.round(a / n);
    }
  }
  return px;
}

function solid(size, rgba) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) px.set(rgba, i * 4);
  return px;
}

// ——— Minimal PNG encoder (RGBA8, no filter) ———
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function writePng(file, size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(OUT, file), png);
  console.log('wrote', file, png.length + ' bytes');
}

writePng('icon.png', 1024, render(1024, 0.42, 'icon'));
writePng('android-icon-foreground.png', 1024, render(1024, 0.3, 'transparent'));
writePng('android-icon-background.png', 1024, solid(1024, [10, 6, 18, 255]));
writePng('android-icon-monochrome.png', 1024, render(1024, 0.3, 'mono'));
writePng('splash-icon.png', 1024, render(1024, 0.35, 'transparent'));
writePng('favicon.png', 48, render(48, 0.45, 'icon'));
