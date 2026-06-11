# ADR-007: Procedurally generated sound and icon assets, checked in

**Date:** 2026-06-11
**Status:** Accepted

## Context

The app needs bundled sounds (ring clicks, spring release, twist whoosh)
and store assets (app icon, adaptive icon set, splash, favicon). No human
recordings or design files exist, and agent-driven development can't record
real audio or use a design tool.

## Decision

Generate all assets offline with dependency-free Node scripts checked into
the repo, and commit the generated files:

- `FidgetApp/scripts/generate-sounds.js` — synthesizes the WAVs in
  `FidgetApp/assets/sounds/` (inharmonic decaying partials for metallic
  clicks, swept tone for spring release, seam-free looped band-passed noise
  for the whoosh). Deterministic PRNG so output is reproducible.
- `FidgetApp/scripts/generate-icons.js` — renders the resting ring stack
  (same geometry and gradient as `src/engine/geometry.ts`) to PNGs with a
  built-in encoder: `icon.png`, Android adaptive foreground/background/
  monochrome, `splash-icon.png`, `favicon.png`.

Regenerate with `npm run generate:assets` from `FidgetApp/`.

## Consequences

- Assets stay in lockstep with the engine's gradient/geometry — change the
  stops in one place, rerun the script.
- Sound character is synthetic; if real recordings are made later they can
  drop in by filename without code changes.
- Total sound payload is ~130KB (the architecture doc estimated <50KB; the
  loopable whoosh accounts for most of the difference). Acceptable.
