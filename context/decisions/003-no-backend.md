# ADR-003: No Backend — Fully Offline, Client-Only

**Date:** 2026-05-15
**Status:** Accepted

---

## Context

Fidget is a tactile toy. Its core value is the feel of interacting with it — physics, sound, haptics. There is no content to fetch, no user identity required to fidget, and no data that needs to leave the device to deliver that value.

We evaluated whether any feature in the current or planned roadmap requires a backend:

| Potential backend need | Verdict |
|------------------------|---------|
| User accounts / auth | No — there is nothing to gate or personalize server-side |
| Cloud sync of presets | No — presets are a handful of numbers; AsyncStorage is sufficient |
| Leaderboard / social | Not in MVP or near-term roadmap |
| Analytics | Could be added client-side (PostHog, Mixpanel) without a custom backend |
| AI-generated sounds or shapes | Speculative; not planned |
| Multiplayer / shared fidget | Speculative; not planned |

---

## Decision

The app is 100% client-side. No API server, no database hosting, no auth service. The only network calls are:
- EAS Build / Expo Workflows (CI/CD tooling, not runtime)
- Optional: third-party analytics SDK (client-to-vendor, no custom server)

User presets persist via `@react-native-async-storage/async-storage` on-device only.

---

## Consequences

**Positive:**
- Zero infrastructure cost and operational overhead.
- Works fully offline — no network required after install.
- Instant cold start — nothing to fetch before the fidget is interactive.
- No auth, no privacy surface, no GDPR data-residency considerations for MVP.
- Dramatically simpler architecture — no API layer, no auth tokens, no error handling for network failures.

**Negative / Tradeoffs:**
- Presets are not backed up — if a user deletes the app, their saved presets are gone. Acceptable for a tactile toy; would not be acceptable for a productivity app.
- No cross-device sync. User's presets live on one device.
- Adding backend features later (cloud sync, social sharing) would require introducing an API layer, auth, and a database — significant work. This is a deliberate deferral, not an oversight.

**Constraints this creates:**
- Do not add any `fetch`, `axios`, or API client calls to the app without an explicit decision to add a backend. If you find yourself reaching for a network call, stop and open a new ADR first.
- Do not add an auth library or user model. There is no concept of a "logged-in user" in this app.
- Analytics SDKs (if added) must be configured to not require a custom server. Use vendor-hosted endpoints only.
