# ADR-006: Manual RNGH gesture instead of Simultaneous(pan, pinch, rotation)

**Date:** 2026-06-11
**Status:** Accepted

## Context

The architecture doc proposed composing `PanGesture + PinchGesture +
RotationGesture` with `Gesture.Simultaneous` for the 1-finger push /
2-finger twist+pinch interactions. During implementation (Sprint 02) this
composition turned out to map poorly onto the prototype's behavior:

- The prototype maps **pixel** spread delta to pull-up (`1px spread ≈ 1px
  pull`). `PinchGesture` reports a unitless scale relative to an unknown
  starting span, so the mapping cannot match the prototype exactly.
- The prototype's mid-gesture transitions (2nd finger lands while dragging,
  one of two fingers lifts) re-snapshot gesture state. A pan gesture that
  ended when the second finger landed cannot re-activate when a finger
  lifts, so the 2→1 finger settle would be lost.

## Decision

Use a single `Gesture.Manual()` with `onTouchesDown/Move/Up/Cancelled`
worklet callbacks that port the prototype's `startOne/startTwo/updateOne/
updateTwo/endAll` handlers 1:1, computing two-finger angle and distance
from raw `TouchData` exactly like the prototype computes them from
`e.touches`. See `FidgetApp/src/components/GestureLayer.tsx`.

## Consequences

- Physics input is bit-for-bit the prototype's logic; the feel matches by
  construction.
- All touch handling runs as worklets on the UI thread — no JS crossings.
- We own touch arbitration ourselves; if other gestures are ever layered on
  the canvas they must be composed with this manual gesture explicitly.
- RNGH delivers the same touch-event stream on Web (pointer events), so the
  mouse fallback comes for free as a 1-finger interaction.
