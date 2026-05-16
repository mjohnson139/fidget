# ADR-005: GitHub Pages for Prototype Iteration

**Date:** 2026-05-16
**Status:** Accepted

---

## Context

The primary design iteration surface for this project is `prototype.html` — a self-contained, single-file browser implementation of the fidget physics and rendering. Iterating on it requires a human to load the file in a browser after each change.

The development workflow is AI-agent-driven: a human describes a change, the agent edits `prototype.html`, commits, and pushes. The human then tests the result. For this loop to be fast, the human must be able to load the current state of the file in a browser without any local tooling — especially important when reviewing from a mobile device.

Two options were considered:

**Option A — Open the raw file locally:**
Works fine when the human and the repo are on the same machine. Breaks entirely when the agent is running remotely (as in Claude Code on the web) and the human is reviewing on a phone.

**Option B — Serve the repo root via GitHub Pages:**
Every push triggers a GitHub Actions workflow that deploys the repo root to GitHub Pages. The prototype is always accessible at a stable public URL regardless of where the human is or which device they're using.

---

## Decision

Use Option B. A GitHub Actions workflow (`.github/workflows/pages.yml`) deploys the repo root to GitHub Pages on every push to any branch. An `index.html` at the repo root auto-redirects to `prototype.html` so the Pages root URL goes directly to the fidget.

The GitHub Pages environment protection rule is set to **"All branches"** (configured in repo Settings → Environments → github-pages) so that feature branch pushes — the default output of agent sessions — deploy immediately without requiring a merge to main.

The live URL is: `https://mjohnson139.github.io/fidget/prototype.html`

---

## Consequences

**Positive:**
- The human can test any agent push from any device, including mobile, within ~30 seconds of the push landing.
- No local dev server, no file sharing, no manual steps after the one-time settings change.
- The prototype is always at a stable, bookmarkable URL.
- Multiple agents or branches can be tested in sequence just by pushing — the last push wins.

**Negative / Tradeoffs:**
- The repo is public (or Pages must be enabled on a public repo), so `prototype.html` is publicly visible. This is acceptable for a non-sensitive UI prototype.
- "Last push wins" means if two branches are being worked simultaneously, only the most recent push is live. This is acceptable given the single-human workflow.
- The GitHub Pages environment must be configured to allow all branches (not just protected branches). This is a one-time manual step that cannot be done via the workflow file itself.

**Constraints this creates:**
- `.github/workflows/pages.yml` must not be deleted or disabled without an explicit decision to change the prototype iteration workflow.
- `index.html` at the repo root exists solely to redirect to `prototype.html`. It should not be repurposed or removed.
- Do not add a build step to the Pages workflow. `prototype.html` is intentionally self-contained and requires no compilation. If it ever needs a build step, open a new ADR.
