# Sprint 02 Handoff — EAS Registration & First Builds

**Audience:** the next agent, running in an environment with EAS credentials
(`EXPO_TOKEN` set, or `eas login` already completed by the human).
**Branch context:** the full app was implemented and pushed on
`claude/expo-app-production-50k77k`. Start from that branch (or `main` if it
has been merged).

Read the repo-root `CLAUDE.md` first. The items below are the open Manual
Prerequisites from `context/sprint-02-requirements.md` — everything else in
Sprint 02 is done and verified (tsc clean, expo-doctor 21/21, exports pass).

---

## 0. Sanity checks before you start

```bash
cd FidgetApp
eas whoami            # must print an account, not an error
npx tsc --noEmit      # should pass — if not, something drifted, stop and investigate
```

All `eas`/`expo`/`npm` commands run from `FidgetApp/`, never the repo root.

## 1. Register the EAS project (`eas init`)

```bash
cd FidgetApp
eas init
```

- Create a **new** project under the credential owner's account; keep the
  slug `fidget` (it must match `expo.slug` in `app.json`).
- Success = `eas init` writes `expo.extra.eas.projectId` (a UUID) into
  `app.json`, and may add an `expo.owner` field. Both are expected.
- Verify with the Sprint 01 check:

```bash
node -e "
const a = require('./app.json');
const id = a?.expo?.extra?.eas?.projectId;
console.log(id ? 'PASS: ' + id : 'FAIL: projectId missing');
process.exit(id ? 0 : 1);
"
```

Commit the updated `app.json` immediately (this is the only file that
should change).

## 2. First preview build — Android first

Android needs no store account and the preview profile produces an
installable APK:

```bash
eas build --profile preview --platform android --non-interactive --no-wait
```

- First run generates an Android keystore — with `--non-interactive` EAS
  creates one automatically. That's correct; don't try to supply one.
- Capture the build URL from the output and report it to the human.

iOS preview (internal distribution) requires an Apple Developer account
and registered device UDIDs (ad-hoc provisioning). Do **not** burn time on
it non-interactively; ask the human to either run
`eas build --profile preview --platform ios` themselves (it prompts for
Apple credentials) or run `eas device:create` first. Report this as a
human step, not a failure.

## 3. Link the GitHub repo for Expo Workflows

`.eas/workflows/build.yml` (repo root) fires preview builds on push to
`main`, but only once the GitHub repo is linked to the EAS project. The
link is created in the Expo dashboard (project → GitHub) — there is no CLI
for it. Ask the human to do this, then verify after the next push to
`main` that a workflow run appears in the dashboard.

## 4. After builds succeed — close out the docs

Per `CLAUDE.md` conventions:

1. In `context/sprint-02-requirements.md`, check off the completed Manual
   Prerequisites and note the build URLs.
2. Update the **Active Sprint** status line in root `CLAUDE.md` if Sprint
   02 is now fully closed (all human verification done).
3. Commit doc updates together with the `app.json` change if not already
   pushed.

## Known context you shouldn't rediscover the hard way

- Stack is Expo SDK 56 / RN 0.85 / Reanimated 4 / Skia 2.6 — newer than
  the architecture doc claims. The reconciliation table is in
  `context/sprint-02-requirements.md`. Trust the code, not the doc's
  version numbers.
- `eas.json` already has development/preview/production profiles and
  `appVersionSource: remote` — production builds auto-increment. Don't
  restructure it.
- The app has no backend, no env vars, no secrets (ADR-003). If a build
  fails, it is a packaging/credentials problem, never a config-injection
  one.
- Store identity is `com.mjohnson139.fidget` on both platforms; icons,
  splash, and sounds are committed, generated assets
  (`npm run generate:assets` regenerates them — ADR-007).
- Do not create a PR or merge to `main` unless the human asks.

## Done means

- [ ] `app.json` has `expo.extra.eas.projectId`, committed and pushed
- [ ] Android preview build completed on EAS with a shareable URL
- [ ] iOS preview build done OR explicitly handed to the human (Apple creds)
- [ ] GitHub repo linked in EAS dashboard (human) and workflow verified on
      next `main` push
- [ ] Sprint 02 doc + CLAUDE.md status updated and pushed
