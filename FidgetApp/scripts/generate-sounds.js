/* eslint-disable */
// Generates the bundled sound assets in assets/sounds/.
// Run: node scripts/generate-sounds.js
// Design target (see context/01_architecture.md): anodized metal fidget toy,
// subtle and physical — short, normalized to about -6dBFS, natural decay.

const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function writeWav(file, samples) {
  // Normalize to -6dBFS
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const gain = peak > 0 ? 0.5 / peak : 0;

  const n = samples.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, file), Buffer.concat([header, data]));
  console.log('wrote', file, (header.length + data.length) + ' bytes');
}

// Deterministic PRNG so assets are reproducible
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Metallic tap: a few inharmonic decaying partials + a tiny noise transient.
function click(baseFreq, seed) {
  const dur = 0.085;
  const n = Math.floor(SR * dur);
  const rand = mulberry32(seed);
  const partials = [1, 1.62, 2.41, 3.17].map((m, i) => ({
    f: baseFreq * m * (1 + (rand() - 0.5) * 0.02),
    a: 1 / (i + 1),
    d: 55 + i * 25, // higher partials die faster
  }));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const p of partials) s += p.a * Math.sin(2 * Math.PI * p.f * t) * Math.exp(-p.d * t);
    // 3ms noise transient for the contact "tick"
    if (t < 0.003) s += (rand() * 2 - 1) * 0.6 * (1 - t / 0.003);
    out[i] = s * Math.exp(-30 * t);
  }
  return out;
}

// Soft spring-release tone: downward sweep with natural decay, ~150ms.
function springRelease() {
  const dur = 0.16;
  const n = Math.floor(SR * dur);
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 620 - 180 * (t / dur);
    phase += (2 * Math.PI * f) / SR;
    const body = Math.sin(phase) + 0.35 * Math.sin(phase * 2.01);
    out[i] = body * Math.exp(-18 * t) * Math.min(1, t / 0.004);
  }
  return out;
}

// Loopable wind swish: band-limited noise, constant level, ends crossfaded
// into the start so it loops without a seam.
function whoosh() {
  const dur = 1.2;
  const n = Math.floor(SR * dur);
  const rand = mulberry32(77);
  const raw = new Float64Array(n);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const white = rand() * 2 - 1;
    lp1 += 0.04 * (white - lp1); // lowpass
    lp2 += 0.012 * (lp1 - lp2); // remove rumble via subtraction below
    raw[i] = lp1 - lp2; // band-passed breathy noise
  }
  const fade = Math.floor(SR * 0.1);
  const out = new Float64Array(n - fade);
  for (let i = 0; i < out.length; i++) {
    if (i < fade) {
      const f = i / fade;
      out[i] = raw[i + (n - fade)] * (1 - f) + raw[i] * f;
    } else {
      out[i] = raw[i];
    }
  }
  return out;
}

fs.mkdirSync(OUT, { recursive: true });
writeWav('click-01.wav', click(1750, 11));
writeWav('click-02.wav', click(2050, 22));
writeWav('click-03.wav', click(1500, 33));
writeWav('spring-release.wav', springRelease());
writeWav('twist-whoosh.wav', whoosh());
