# ADR-004: Documentation-First Repository Structure

**Date:** 2026-05-15
**Status:** Accepted

---

## Context

This project is developed by AI agents guided by a human. No agent carries memory between sessions — each session starts cold. The repo is the only persistent knowledge store the agent has access to. If the repo's primary layer is code, an agent starting a new session must reverse-engineer intent from implementation, which is slow and error-prone.

Two structural options were considered:

**Option A — Standard Expo layout (app at root):**
```
fidget/
├── app/           # Expo Router screens
├── src/           # Source code
├── assets/
└── package.json
```
Docs would be a secondary concern, added alongside code.

**Option B — Documentation-first (app in subdirectory):**
```
fidget/
├── context/       # Architecture, sprint specs, ADRs — PRIMARY layer
├── CLAUDE.md      # Agent orientation
├── prototype.html # Reference
└── FidgetApp/     # All Expo code — secondary layer
```

---

## Decision

Use Option B. The `context/` directory and `CLAUDE.md` at the repo root are the primary layer. The Expo app lives in `FidgetApp/`. Every sprint produces documentation before code.

The repo communicates intent to agents through:
- `CLAUDE.md` — orientation file every agent reads at session start
- `context/01_architecture.md` — canonical technical decisions
- `context/sprint-NN-requirements.md` — active sprint scope and verification checklist
- `context/decisions/` — ADRs for significant choices (this file is one)
- `prototype.html` — physics reference that the code must match in behavior

---

## Consequences

**Positive:**
- An agent starting a cold session reads `CLAUDE.md` → `context/` and has full context within a few file reads. No reverse-engineering from code.
- Sprint requirements include an agent-executable verification checklist. An agent can verify its own work programmatically before reporting done.
- ADRs prevent decision churn — an agent encountering an unexpected constraint reads the relevant ADR instead of "fixing" it.
- Human oversight is easier: reviewing a sprint requirements doc is faster than reviewing code.

**Negative / Tradeoffs:**
- Documentation must be kept current. A stale architecture doc is worse than no doc — it actively misleads agents. This requires discipline from both the human and the agent: update docs when decisions change, not after.
- Slightly more ceremony per sprint: writing a requirements doc before executing. The tradeoff is fewer misdirected agent sessions.
- Agents must be explicitly told to run from `FidgetApp/` for Expo/npm commands. Without `CLAUDE.md`, an agent will try to run `expo start` from the repo root and fail.

**Constraints this creates:**
- Every sprint begins with a requirements doc in `context/`. No code sprint starts without one.
- Every significant architectural decision gets an ADR in `context/decisions/`. "Significant" means: a future agent would be surprised by the choice, or would likely reverse it without the context.
- `CLAUDE.md` must be updated whenever the repo structure, active sprint, or workflow conventions change. It is a living document, not a one-time artifact.
- The `context/` directory is never deleted or reorganized without updating `CLAUDE.md` to reflect the change.
