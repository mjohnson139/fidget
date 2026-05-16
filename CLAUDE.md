# Fidget — Agent Orientation

Read this file at the start of every session. It is the authoritative guide to how this repo is organized and how work gets done.

---

## What This Project Is

A tactile fidget toy mobile app built with Expo. It renders concentric star-shaped rings on a hardware-accelerated canvas, driven by spring physics. Touch input pushes, twists, and extends the rings. Sound and haptics reinforce the physical feel. No backend. No accounts. Fully offline.

The physical reference is a real 10-pointed star fidget toy. The software reference is `prototype.html` at the repo root — a working browser implementation of the core physics and rendering. When in doubt about behavior, match the prototype.

---

## Repo Map

```
fidget/                          ← repo root
├── CLAUDE.md                    ← you are here — read first
├── prototype.html               ← physics + rendering reference
├── README.md                    ← human-readable overview
├── context/                     ← PRIMARY LAYER — read before touching code
│   ├── 01_architecture.md       ← canonical technical decisions and stack
│   ├── sprint-NN-requirements.md ← active sprint spec and verification checklist
│   └── decisions/               ← ADRs — one file per significant decision
│       ├── 001-skia-renderer.md
│       ├── 002-reanimated-worklets-physics.md
│       ├── 003-no-backend.md
│       └── 004-documentation-first-repo-structure.md
└── FidgetApp/                   ← ALL Expo app code lives here
    ├── app/                     ← Expo Router screens
    ├── src/                     ← engine, components, audio, haptics, store
    ├── assets/                  ← sounds, images
    ├── app.json
    ├── eas.json
    └── package.json
```

---

## Before You Write Code

Do these in order. Do not skip.

1. **Read the active sprint requirements doc** — identified by the **Active Sprint** section below in this file. Do not determine the active sprint from filename ordering; sprint docs may be drafted ahead of execution. The Active Sprint section is the authoritative pointer.

2. **Read the architecture doc** — `context/01_architecture.md` — if you are touching the rendering, physics, gesture, audio, or haptic systems. It contains the full parameter reference and data flow.

3. **Read the relevant ADR** — if you are making or questioning a significant technical decision, check `context/decisions/` first. The decision may already be made and recorded.

4. **Check the prototype** — `prototype.html` is the source of truth for physics behavior. Open it in a browser if you need to understand how a parameter affects the fidget. Match its feel, not its code structure.

---

## Running Commands

**All `expo`, `npx`, `npm`, and `eas` commands run from `FidgetApp/`, not the repo root.**

```bash
# Correct
cd FidgetApp && expo start
cd FidgetApp && npx tsc --noEmit
cd FidgetApp && npx expo-doctor
cd FidgetApp && eas build --profile preview

# Wrong — will fail or produce errors
expo start          # run from repo root
npm install         # run from repo root
```

The repo root contains no `package.json`. Running package commands there will fail.

---

## Verifying Your Work

Every sprint requirements doc includes an **Agent Verification Checklist** with exact bash commands and explicit pass conditions. Run it before reporting work as done.

The omnibus command from Sprint 01:

```bash
cd "$(git rev-parse --show-toplevel)"
echo "=== Verification ===" \
&& test -d FidgetApp && test -d context/decisions && test -f CLAUDE.md \
&& test -s FidgetApp/package.json && test -s FidgetApp/eas.json \
&& test -s FidgetApp/app/_layout.tsx && test -s FidgetApp/app/index.tsx \
&& (cd FidgetApp && npx tsc --noEmit) \
&& (cd FidgetApp && npx expo-doctor) \
&& test -f .eas/workflows/build.yml \
&& echo "=== ALL CHECKS PASSED ===" \
|| echo "=== VERIFICATION FAILED ==="
```

Do not mark a task complete if verification fails.

---

## Guardrails

These constraints are set by ADRs. Do not work around them without opening a new ADR and getting explicit human approval.

| Constraint | Why | ADR |
|------------|-----|-----|
| Rendering uses Skia only — no SVG, no Animated, no GL | Skia is the only layer that can draw arbitrary paths at 60fps on the UI thread | 001 |
| Physics runs in a Reanimated worklet — never on the JS thread | JS-thread animation produces frame drops | 002 |
| No `fetch`, no API client, no auth library | This app has no backend and no concept of a logged-in user | 003 |
| No `runOnJS` inside the frame loop except audio/haptic triggers | Every JS bridge crossing is a potential frame drop | 002 |
| New significant technical decisions get an ADR in `context/decisions/` | Decisions must survive across sessions | 004 |
| `CLAUDE.md` is updated when repo structure or conventions change | A stale orientation file misleads future agents | 004 |

---

## Conventions

**Physics parameters** — All physics and shape parameters are defined in `FidgetParams` (`FidgetApp/src/engine/types.ts`). Do not invent new parameters without adding them to the type and updating the architecture doc.

**Worklet-safe functions** — Functions called from the Reanimated physics worklet must be annotated `'worklet'` or be plain JavaScript (no closures over React state, no async). `geometry.ts` exports are the worklet's pure math library.

**Sound triggers** — Audio and haptics fire via `useAnimatedReaction` → `runOnJS`. This is the only sanctioned bridge crossing in the render loop. Do not add additional `runOnJS` calls without a clear reason.

**File locations** — New source files go in `FidgetApp/src/<subsystem>/`. New screens go in `FidgetApp/app/`. Do not create source files at the repo root or in `context/`.

**TypeScript** — Strict mode is on. No `any`. No `// @ts-ignore`. Fix types properly.

---

## Active Sprint

**Sprint 01** — `context/sprint-01-requirements.md`

Goal: Scaffold the Expo project, install all dependencies, initialize EAS, wire up Expo Workflows CI/CD. No physics or UI code — just a green baseline that boots on iOS, Android, and Web.

---

## Starting a New Sprint

When Sprint N is complete and verified:

1. **Documentation reconciliation** — diff what the sprint requirements doc said would be built against what was actually implemented. Flag any divergence (different package versions used, different file structure, workarounds taken) as updates to the architecture doc or new ADRs. Do this before writing the next sprint's requirements.
2. Create `context/sprint-NN-requirements.md` for the next sprint
3. Update the **Active Sprint** section in this file to point to it
4. Write any new ADRs triggered by decisions made during the sprint
5. Commit all context changes before starting code work on the new sprint
