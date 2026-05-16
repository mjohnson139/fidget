# Sprint 01 — Project Setup, Dependencies & CI/CD

**Date:** 2026-05-15
**Status:** Ready for planning
**Scope:** Lightweight — infrastructure sprint, no product behavior shipped

---

## Goal

Leave the repository in a state where Sprint 2 can write physics code without any tooling friction. The app must boot on iOS, Android, and Web. Automated builds must fire on every push to `main`.

---

## What We're Building

Scaffold a fresh Expo SDK 53 TypeScript project in `FidgetApp/`, install all dependencies called for by the architecture doc, initialize EAS, and configure Expo Workflows for automated preview builds. No UI, no physics — just a green "app boots" baseline.

---

## Acceptance Criteria

1. `expo start` launches the app on iOS simulator, Android emulator, and Web without errors *(Human-verified — not covered by automated checklist; requires a running simulator/emulator)*
2. All architecture-specified packages are installed and importable (no missing peer deps or metro resolution errors)
3. EAS configuration is correctly structured — `eas.json` has three build profiles and `app.json` contains a registered `projectId`. *(Actual `eas build` execution requires EAS account credentials — human-verified prerequisite; see Manual Prerequisites below)*
4. Expo Workflows config (`FidgetApp/.eas/workflows/build.yml`) exists, references the preview profile, and triggers on pushes to `main`. *(Live pipeline execution on push is human-verified — static config is agent-verifiable via Check 11)*
5. TypeScript strict mode is enabled and `tsc --noEmit` passes on the empty scaffold
6. The Expo app lives in `FidgetApp/` — the repo root is reserved for docs and context

---

## Dependencies to Install

Using latest available SDK at scaffold time (Expo 54, React 19.1, RN 0.81.5):

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | `~54.0.33` | Core framework |
| `react` | `19.1.0` | — |
| `react-native` | `0.81.5` | — |
| `@shopify/react-native-skia` | `^1.x` | Hardware-accelerated canvas rendering |
| `react-native-reanimated` | `~3.x` | UI-thread physics worklets |
| `react-native-gesture-handler` | `~2.24.0` | Multitouch gesture composition |
| `expo-audio` | `~0.4.x` | Sound playback |
| `expo-haptics` | `~14.x` | Haptic feedback |
| `@react-native-async-storage/async-storage` | `2.1.2` | Preset persistence |
| `react-native-safe-area-context` | `^5.4.0` | Safe area insets |
| `expo-status-bar` | `~3.0.9` | Status bar control |

---

## Repository Structure

The repo is documentation-first. Since development is agent-driven, the context layer at the root is the primary artifact — agents read it before touching code. The Expo app lives in `FidgetApp/` so the root stays clean for docs.

```
fidget/                          # Repo root — docs are the primary layer
├── context/                     # Agent context: architecture, specs, decisions
│   ├── 01_architecture.md       # (already exists)
│   ├── sprint-01-requirements.md
│   ├── sprint-NN-requirements.md
│   └── decisions/               # ADRs — all four already exist
│       ├── 001-skia-renderer.md
│       ├── 002-reanimated-worklets-physics.md
│       ├── 003-no-backend.md
│       └── 004-documentation-first-repo-structure.md
├── prototype.html               # Reference prototype (already exists)
├── README.md                    # Human-readable overview + quick links
├── CLAUDE.md                    # Agent instructions (conventions, paths, workflow)
└── FidgetApp/                   # Expo app — all code lives here
    ├── app/
    │   ├── _layout.tsx          # Root layout (stub)
    │   └── index.tsx            # Single screen (Hello World stub)
    ├── src/
    │   ├── engine/              # (empty — Sprint 2)
    │   ├── components/          # (empty — Sprint 2)
    │   ├── audio/              # (empty — Sprint 2)
    │   ├── haptics/            # (empty — Sprint 2)
    │   └── store/              # (empty — Sprint 2)
    ├── assets/
    │   └── sounds/             # (empty — Sprint 4)
    ├── app.json
    ├── eas.json
    ├── tsconfig.json
    └── package.json
```

### CLAUDE.md (root)

`CLAUDE.md` already exists at the repo root — **do not recreate it**. Verify it contains the following; update it if any item is missing:
- The app code is in `FidgetApp/` — all `expo`, `npx`, and `npm` commands run from there
- The architecture doc is at `context/01_architecture.md` — read it before any code work
- The active sprint is identified by the **Active Sprint section in `CLAUDE.md`** — do not determine the active sprint from filename ordering alone
- All significant decisions get an ADR in `context/decisions/`
- The prototype at `prototype.html` is the physics reference — match its behavior, not its code

---

## EAS Configuration

Three build profiles matching the expo-sudoku reference:

- **development** — development client, internal distribution (for device testing)
- **preview** — internal distribution, no dev client (for stakeholder sharing)
- **production** — store distribution (not used this sprint)

---

## Expo Workflows (CI/CD)

Configure a workflow at `.eas/workflows/build.yml` that:
- Triggers on push to `main`
- Runs a **preview** EAS build for iOS and Android
- Posts the build URL to the workflow summary

Delivery target this sprint is **Expo Go** — the preview build link is shareable without App Store review.

---

## Out of Scope for This Sprint

- Any physics, rendering, or gesture code
- Sound assets
- The Tuner panel UI
- App Store / Play Store submission config
- Web build optimization (CanvasKit bundle size) — deferred; constraints documented in ADR-001
- Multi-environment secrets management

---

## Manual Prerequisites

These steps require human action before the agent can run the verification checklist. They cannot be automated.

1. **EAS authentication** — Run `eas login` (or set `EXPO_TOKEN` in the environment) before running `eas init`. An unauthenticated agent cannot complete project registration.
2. **`eas init`** — Run once to register the project and populate `expo.extra.eas.projectId` in `app.json`. Commit the updated `app.json`.
3. **Live boot test** — After `expo start`, manually verify the app renders on iOS simulator, Android emulator, and Web. This cannot be scripted.
4. **Expo Workflows smoke test** — After merging to `main`, verify a preview build triggers in the Expo dashboard. This requires a live push and active EAS account.

---

## Agent Verification Checklist

Automated checks only. All commands run from the **repo root** (`fidget/`) unless noted otherwise. Pass condition is stated explicitly. The sprint is complete when every automated check passes **and** all Manual Prerequisites above have been completed by a human.

**HUMAN VERIFICATION REQUIRED items (cannot be automated):**
- AC#1: `expo start` boots on iOS simulator, Android emulator, and Web — run manually
- AC#4: Expo Workflows pipeline fires on push to `main` — verify in Expo dashboard after first push

---

### 1. Repository Structure

```bash
# 1.1 FidgetApp subdirectory exists
test -d FidgetApp && echo PASS || echo FAIL

# 1.2 Documentation layer intact
test -f context/01_architecture.md && echo PASS || echo FAIL
test -d context/decisions && echo PASS || echo FAIL
test -f CLAUDE.md && echo PASS || echo FAIL

# 1.3 Source skeleton directories exist
for d in \
  FidgetApp/app \
  FidgetApp/src/engine \
  FidgetApp/src/components \
  FidgetApp/src/audio \
  FidgetApp/src/haptics \
  FidgetApp/src/store \
  FidgetApp/assets/sounds; do
  test -d "$d" && echo "PASS: $d" || echo "FAIL: $d"
done
```

**Pass:** every line prints `PASS`.

---

### 2. Key Files Exist and Are Non-Empty

```bash
for f in \
  FidgetApp/package.json \
  FidgetApp/app.json \
  FidgetApp/eas.json \
  FidgetApp/tsconfig.json \
  FidgetApp/app/_layout.tsx \
  FidgetApp/app/index.tsx; do
  test -s "$f" && echo "PASS: $f" || echo "FAIL: $f"
done
```

**Pass:** every line prints `PASS` (`-s` checks non-empty, not just existence).

---

### 3. Required Dependencies in package.json

```bash
cd FidgetApp && node -e "
const p = require('./package.json');
const deps = {...p.dependencies, ...p.devDependencies};
const required = [
  'expo',
  'react',
  'react-native',
  '@shopify/react-native-skia',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'expo-audio',
  'expo-haptics',
  '@react-native-async-storage/async-storage',
  'react-native-safe-area-context',
  'expo-status-bar'
];
let pass = true;
required.forEach(pkg => {
  if (deps[pkg]) { console.log('PASS: ' + pkg + ' @ ' + deps[pkg]); }
  else { console.log('FAIL: ' + pkg + ' missing'); pass = false; }
});
process.exit(pass ? 0 : 1);
"
```

**Pass:** exit code 0, every line prints `PASS: <pkg> @ <version>`.

---

### 4. Dependencies Installed (node_modules)

```bash
cd FidgetApp && node -e "
const required = [
  '@shopify/react-native-skia',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'expo-audio',
  'expo-haptics',
  '@react-native-async-storage/async-storage',
  'react-native-safe-area-context'
];
const fs = require('fs');
let pass = true;
required.forEach(pkg => {
  const exists = fs.existsSync('node_modules/' + pkg);
  console.log((exists ? 'PASS' : 'FAIL') + ': node_modules/' + pkg);
  if (!exists) pass = false;
});
process.exit(pass ? 0 : 1);
"
```

**Pass:** exit code 0, every line prints `PASS`.

---

### 5. Expo SDK Version

```bash
cd FidgetApp && node -e "
const v = require('./package.json').dependencies.expo;
const ok = v && v.startsWith('54');
console.log(ok ? 'PASS: expo @ ' + v : 'FAIL: expected 53.x, got ' + v);
process.exit(ok ? 0 : 1);
"
```

**Pass:** exit code 0, prints `PASS: expo @ 54.x.x`.

---

### 6. TypeScript Strict Mode Enabled

Uses `tsc --showConfig` which resolves the full `extends` chain and handles JSONC — avoids false failures when `strict: true` is inherited from `expo/tsconfig.base` rather than set explicitly.

```bash
cd FidgetApp && npx tsc --showConfig 2>/dev/null \
  | node -e "
const chunks = [];
process.stdin.on('data', d => chunks.push(d));
process.stdin.on('end', () => {
  const cfg = JSON.parse(chunks.join(''));
  const ok = cfg.compilerOptions && cfg.compilerOptions.strict === true;
  console.log(ok ? 'PASS: strict mode enabled' : 'FAIL: strict not true in resolved config');
  process.exit(ok ? 0 : 1);
});
"
```

**Pass:** exit code 0, prints `PASS: strict mode enabled`.

---

### 7. TypeScript Compiles Clean

```bash
cd FidgetApp && npx tsc --noEmit 2>&1
echo "tsc exit code: $?"
```

**Pass:** exit code 0, no output (or only warnings, no errors).

---

### 8. Expo Doctor

```bash
cd FidgetApp && npx expo-doctor 2>&1
echo "expo-doctor exit code: $?"
```

**Pass:** exit code 0. Any `ERROR` lines in output are failures.

---

### 9. EAS Build Profiles

```bash
cd FidgetApp && node -e "
const e = require('./eas.json');
const required = ['development', 'preview', 'production'];
let pass = true;
required.forEach(profile => {
  const ok = e.build && e.build[profile];
  console.log((ok ? 'PASS' : 'FAIL') + ': eas.json build.' + profile);
  if (!ok) pass = false;
});
process.exit(pass ? 0 : 1);
"
```

**Pass:** exit code 0, all three profiles print `PASS`.

---

### 10. EAS Project ID Registered

```bash
cd FidgetApp && node -e "
const a = require('./app.json');
const id = a?.expo?.extra?.eas?.projectId;
const ok = typeof id === 'string' && id.length > 0;
console.log(ok ? 'PASS: projectId = ' + id : 'FAIL: expo.extra.eas.projectId missing or empty');
process.exit(ok ? 0 : 1);
"
```

**Pass:** exit code 0, prints `PASS: projectId = <uuid>`.

---

### 11. Expo Workflows Config Exists

```bash
# Workflow file exists at repo root .eas/workflows/
test -f .eas/workflows/build.yml && echo "PASS: .eas/workflows/build.yml exists" || echo "FAIL: missing"

# File references main branch
grep -q "main" .eas/workflows/build.yml \
  && echo "PASS: workflow references main branch" \
  || echo "FAIL: no reference to main branch in workflow YAML"

# File references preview build profile
grep -q "preview" .eas/workflows/build.yml \
  && echo "PASS: workflow references preview profile" \
  || echo "FAIL: no preview profile in workflow YAML"
```

**Pass:** all three lines print `PASS`.

---

### 12. CLAUDE.md Contains Required Agent Orientation

Checks for the critical running-commands instruction and other orientation anchors. `cd FidgetApp` is the most important — without it agents run expo commands from the wrong directory.

```bash
for term in "cd FidgetApp" "context/01_architecture.md" "context/decisions" "prototype.html" "Active Sprint"; do
  grep -qi "$term" CLAUDE.md \
    && echo "PASS: CLAUDE.md mentions '$term'" \
    || echo "FAIL: CLAUDE.md missing mention of '$term'"
done
```

**Pass:** all five lines print `PASS`.

---

### 13. ~~Stub Files Render Valid JSX~~ — Covered by Check 7

Check 13 (JSX regex heuristic) has been removed. `tsc --noEmit` (Check 7) is the authoritative validator for JSX correctness — if the stub file exports an invalid component the TypeScript compiler catches it. Regex detection of JSX was both too strict (rejecting valid `return null` stubs) and too loose (passing non-JSX files with `return (`).

---

### Running All Checks

An agent can run the full suite in sequence:

```bash
cd "$(git rev-parse --show-toplevel)"
echo "=== Sprint 1 Verification ===" \
&& echo "--- 1. Structure ---" \
&& test -d FidgetApp && test -d context/decisions && test -f CLAUDE.md \
&& echo "--- 2. Files ---" \
&& test -s FidgetApp/package.json && test -s FidgetApp/eas.json && test -s FidgetApp/tsconfig.json \
&& test -s FidgetApp/app/_layout.tsx && test -s FidgetApp/app/index.tsx \
&& echo "--- 3. TypeScript ---" \
&& (cd FidgetApp && npx tsc --noEmit) \
&& echo "--- 4. Expo Doctor ---" \
&& (cd FidgetApp && npx expo-doctor) \
&& echo "--- 5. Workflows ---" \
&& test -f .eas/workflows/build.yml \
&& grep -q "main" .eas/workflows/build.yml \
&& echo "=== ALL CHECKS PASSED ===" \
|| echo "=== VERIFICATION FAILED ==="
```

**Pass:** final line is `=== ALL CHECKS PASSED ===`.

---

## Reference

- Architecture: `context/01_architecture.md`
- Prototype: `prototype.html`
- Stack reference: `expo-sudoku` project (Expo 53 baseline)
- Expo Workflows docs: https://expo.dev/services/workflows

---

## Open Questions

These items were flagged during doc review but require a human decision before they can be resolved.

**OQ-1: prototype.html is not agent-readable**
The architecture doc instructs agents to "match the prototype" and Sprint 2 will need to port the `tick()` loop and `starVertices()` function verbatim. Agents cannot open a browser. Before Sprint 2 starts, consider extracting the canonical physics constants, the tick loop pseudocode, and the color gradient stops from `prototype.html` into `context/physics-reference.md` — a text file agents can read. Decision: extract before Sprint 2, or note this as a human-mediated handoff step?

**OQ-2: Cold-start orientation degrades as codebase grows**
ADR-004 claims "full context in a few file reads." This holds at Sprint 1 when there is no code. By Sprint 4–5, when physics, rendering, and gesture systems are implemented, agents will also need to read source files to understand current state vs. planned state. Convention to consider: as subsystems are implemented, annotate the architecture doc section with "implemented in Sprint N" so agents know what to trust from docs vs. what to verify in code.
