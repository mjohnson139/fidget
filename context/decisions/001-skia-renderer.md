# ADR-001: React Native Skia for Rendering

**Date:** 2026-05-15
**Status:** Accepted

---

## Context

The fidget is a canvas of N concentric star-shaped rings (up to 60) that must be redrawn every frame at 60fps. Each ring is a closed path with up to 40 vertices, filled with a per-ring interpolated color and an optional outline stroke. The reference implementation (`prototype.html`) uses the browser's Canvas 2D API.

We need a React Native rendering layer that can:
- Draw arbitrary closed paths per frame
- Run on iOS, Android, and Web from a single codebase
- Integrate with Reanimated worklets so the draw call happens on the UI thread without crossing the JS bridge

Candidates evaluated:

| Option | Notes |
|--------|-------|
| `@shopify/react-native-skia` | Native Skia engine; path API; Reanimated integration; CanvasKit on Web |
| `react-native-canvas` | Thin wrapper over a WebView canvas — bridge overhead, abandoned |
| `expo-gl` / raw OpenGL | Too low-level; requires shader authorship for path rendering |
| `react-native-svg` | SVG paths work but SVG is not designed for per-frame mutation at 60fps |
| `react-native-game-engine` | Game loop abstraction but still needs an underlying renderer |
| Plain `Animated` + `View` | Cannot draw paths; only transforms and opacity |

---

## Decision

Use `@shopify/react-native-skia` as the sole rendering layer.

---

## Consequences

**Positive:**
- Hardware-accelerated Skia engine — the same renderer used by Flutter. Draws 60 star rings per frame well within budget.
- Path API mirrors the Canvas 2D API in `prototype.html` — `starVertices()` and `colorAt()` port directly.
- Native Reanimated integration: in react-native-skia ^1.x, Skia components accept Reanimated `useSharedValue` values directly as animated props. The Skia renderer reads these on the UI thread automatically — no bridge crossing per frame. (Note: the pre-1.0 `useValue`/`useDerivedValue` Skia-internal primitives were removed in 1.0; use standard Reanimated shared values.)
- Web support via CanvasKit (WASM) — same API, no code changes needed for Web target.

**Negative / Tradeoffs:**
- Adds ~5MB to the native binary (Skia engine). Acceptable for a standalone app; would be significant in a library.
- CanvasKit WASM adds ~2MB to the web bundle and has a cold-start parse cost. First web load is slower than native.
- Skia's React Native API is Shopify-maintained, not Meta or Expo. Dependency on a third-party maintainer.

**Constraints this creates:**
- All drawing must go through Skia — do not introduce a second rendering layer (e.g., mixing SVG or Animated views behind the canvas).
- Web performance testing must account for CanvasKit WASM initialization. Do not assume native and web perf are equivalent.
- Upgrade Skia in lockstep with Reanimated — the worklet integration is version-coupled.
