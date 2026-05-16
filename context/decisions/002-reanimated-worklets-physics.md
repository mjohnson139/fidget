# ADR-002: Reanimated Worklets for the Physics Loop

**Date:** 2026-05-15
**Status:** Accepted

---

## Context

The fidget's physics simulation runs every frame: spring forces update a 3-axis joystick position (kx, ky, kz), then N ring positions are derived from that state. This is cheap math — but it must happen at 60fps without any JS bridge crossings or the frame will drop.

React Native's default threading model runs JavaScript on a separate JS thread. Any animation that reads or writes React state from the JS thread is subject to bridge latency and JS garbage collection pauses — both of which manifest as visible jank at 60fps.

Candidates evaluated:

| Option | Where physics runs | Bridge per frame? | Notes |
|--------|-------------------|-------------------|-------|
| `useState` + `useEffect` loop | JS thread | Yes — every frame | Guaranteed jank; unacceptable |
| `Animated` API | UI thread (native driver) | No | Cannot express arbitrary physics; only pre-declared transforms |
| `requestAnimationFrame` on JS thread | JS thread | Yes — every frame | Same problem as useState |
| Reanimated v3 `useFrameCallback` worklet | UI thread | No | Runs arbitrary JS as a native worklet |
| `react-native-game-engine` | JS thread | Yes — every frame | Adds abstraction without fixing the threading problem |

---

## Decision

Run the entire physics simulation inside a Reanimated v3 `useFrameCallback` worklet. All physics state (kx, ky, kz, userSpin, userSpinVel) lives in Reanimated shared values. Parameter changes from the Tuner panel write directly to shared values. Audio and haptic triggers use `useAnimatedReaction` → `runOnJS` — the only JS bridge crossing in the loop, and it's conditional.

---

## Consequences

**Positive:**
- Physics and rendering stay on the UI thread. Zero bridge crossings per frame for the core loop.
- Reanimated shared values are the single source of truth for all physics state — gesture handlers, the physics worklet, and the Skia renderer all read/write the same values without marshalling.
- `useFrameCallback` is the Reanimated-idiomatic replacement for `requestAnimationFrame` and receives the same frame timestamp.
- Parameter changes from sliders in the Tuner panel propagate to the worklet instantly — no async delay.

**Negative / Tradeoffs:**
- Worklets are JavaScript but compiled to native instructions. Not all JS APIs are available inside a worklet — only worklet-safe functions can be called. `geometry.ts` functions (`starVertices`, `colorAt`) must be annotated `'worklet'` or declared as plain functions (which are auto-inlined).
- Debugging worklets is harder than debugging regular JS — no standard debugger breakpoints inside a worklet context.
- Error messages from worklet crashes can be cryptic. Defensive coding inside worklets is more important than in regular JS.

**Constraints this creates:**
- Never move the physics tick to the JS thread. If a future agent "simplifies" by using `useState` or `useEffect` for animation, frame drops will result.
- All functions called from the physics worklet must be worklet-compatible. Test this at the import level, not at runtime.
- Audio and haptic triggers are the only `runOnJS` calls allowed inside the frame loop. Do not add React state setters or other JS-thread calls inside `useFrameCallback`.
- Reanimated and Skia versions must stay compatible — check both changelogs before upgrading either.
