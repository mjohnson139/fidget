# ADR-008: Skia on web via a CanvasKit loader gate

**Status:** Accepted
**Date:** 2026-06-11
**Context sprint:** Sprint 02 (discovered during the EAS handoff)

## Context

The app renders exclusively through `@shopify/react-native-skia` (ADR-001). On
iOS/Android the Skia engine is compiled into the native binary and is available
the instant the app boots. On web there is no native layer: Skia draws through
**CanvasKit**, a WebAssembly build that must be fetched and initialized *before*
any `<Canvas>` mounts. If a Skia component renders before CanvasKit is ready, it
silently draws nothing.

The Sprint 02 MVP shipped with a web target configured (`react-native-web`,
`app.json` web block) and `npx expo export -p web` listed as passing. But
"export succeeds" only proves the JS bundle compiles — it never exercises
rendering. The app had no CanvasKit loader, so the first EAS Hosting deploy was
a blank screen. This was found only by deploying and opening it, not by any
build-time check.

## Decision

Keep web as a supported (secondary) target and bootstrap CanvasKit explicitly:

1. **Ship the wasm.** `npx setup-skia-web public` copies the version-matched
   `canvaskit.wasm` from `node_modules` into `FidgetApp/public/`, where Expo
   serves it at `/canvaskit.wasm`. This is wired into a `setup:skia-web` npm
   script **and** `postinstall`, so it regenerates on every install and the
   blank-screen bug cannot silently return. The binary is gitignored (8 MB,
   fully regenerable — not source).

2. **Gate rendering on load.** `src/components/useSkiaWebReady.ts` returns
   `true` immediately on native; on web it awaits `LoadSkiaWeb()` and flips to
   `true` once CanvasKit is initialized. `app/index.tsx` renders `<FidgetCanvas>`
   only when the hook is ready. The dark background shows until then.

## Consequences

- Web renders correctly and is deployable to EAS Hosting (`eas deploy`),
  credential-free. Production alias: https://fidget.expo.app.
- **The app cannot run in Expo Go.** Skia is a native module Expo Go does not
  bundle; Expo Go is therefore not a valid test path. On-device testing uses an
  EAS development or preview build (Android preview installs with no developer
  account); web is the credential-free browser fallback.
- Web stays a "feel-check" surface, not the performance reference. The native
  build remains the source of truth for physics feel (CanvasKit + the
  Reanimated/worklet path on web have different perf characteristics).
- This does not weaken ADR-001: web still renders through Skia, only via its
  WASM backend instead of the native one.
