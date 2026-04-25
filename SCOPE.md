# SCOPE — agent-fleet v0.1

Output of Stage 1 (Scope compression). Default verdict for any feature is **DEFERRED**. Inclusion in v0.1 requires either (a) a real first-party caller TODAY, or (b) the primary use case dies without it.

## Primary use case

> **"Every Monday morning, one issue is open in each of my N enrolled OSS repos summarizing what needs my attention. Every newly enrolled repo already has CI / Renovate / claude-code-review / release-please baseline applied."**

If this Monday-morning experience does not work end-to-end on a clean checkout with two commands, agent-fleet has not shipped v0.1.

---

## Features evaluated

### F1 — `enroll` command (install kit in target repo)
- First-party caller TODAY? **Yes — `agent-id` and `agent-ask` are ready to enroll.**
- Primary use case dies without it? **Yes — without enroll, no baseline is applied; tick has nothing well-formed to query.**
- Reinvents existing primitive? **No — wraps and orchestrates mature primitives (claude-code-action, Renovate, release-please).**
- **VERDICT: IN-V0.1**

### F2 — `tick` command (weekly per-repo health check)
- First-party caller TODAY? **Yes — the GH Actions cron in agent-fleet itself.**
- Primary use case dies without it? **Yes — the Monday-morning issue is the deliverable.**
- Reinvents? **No — composes Anthropic SDK + `gh` CLI.**
- **VERDICT: IN-V0.1**

### F3 — `fleet.yaml` schema (Zod-validated, strict)
- First-party caller TODAY? **Yes — both enroll and tick read it.**
- Primary use case dies without it? **Yes.**
- Reinvents? **No.**
- **VERDICT: IN-V0.1**

### F4 — `typescript-bun` template kit (5 files: ci, claude-review, release-please workflow, renovate, release-please config)
- First-party caller TODAY? **Yes — every repo in the family is TS+Bun.**
- Primary use case dies without it? **Yes — enroll has nothing to install.**
- Reinvents? **No — files are thin wrappers around mature actions.**
- **VERDICT: IN-V0.1**

### F5 — GH Actions cron workflow in agent-fleet repo (the trigger)
- First-party caller TODAY? **Yes — the user's primary trigger.**
- Primary use case dies without it? **Yes — without cron, tick is just a manual CLI; "agentic without me" fails.**
- Reinvents? **No.**
- **VERDICT: IN-V0.1**

### F6 — Conformance test vectors (C1–C5)
- First-party caller TODAY? **Yes — CI runs them on every push.**
- Primary use case dies without it? **No, but releasing without conformance violates the project scaffold.**
- Reinvents? **No.**
- **VERDICT: IN-V0.1**

### F7 — 20-line demo script
- First-party caller TODAY? **Yes — the user when validating end-to-end.**
- Primary use case dies without it? **No, but no-demo violates the scaffold.**
- Reinvents? **No.**
- **VERDICT: IN-V0.1**

---

### F8 — `sync` command + drift detection (re-apply template, warn on local divergence)
- First-party caller TODAY? **No — no enrolled repo has drifted yet.**
- Primary use case dies without it? **No — re-running enroll overwrites; that's acceptable for v0.1.**
- **VERDICT: DEFERRED-V0.2**

### F9 — Per-repo overrides in fleet.yaml
- First-party caller TODAY? **None — every current repo wants the same kit.**
- Primary use case dies without it? **No.**
- **VERDICT: DEFERRED-V0.2**

### F10 — Anthropic Scheduled Tasks instead of GH Actions cron
- First-party caller TODAY? **None — GH Actions works.**
- Primary use case dies without it? **No.**
- **VERDICT: DEFERRED-V0.2** (revisit if GH cron flakes)

### F11 — Cross-repo audits (security across fleet, dep version unification)
- First-party caller TODAY? **None — per-repo health check is enough for v0.1.**
- Primary use case dies without it? **No.**
- **VERDICT: DEFERRED-V0.2**

### F12 — Local-path-only mode (operate without GitHub)
- First-party caller TODAY? **None — every enrolled repo is on GitHub.**
- Primary use case dies without it? **No.**
- **VERDICT: DEFERRED-V0.2**

---

### F13 — Multi-language templates (Rust, Python, Go)
- First-party caller TODAY? **None — entire family is TS+Bun.**
- Primary use case dies without it? **No.**
- **VERDICT: CUT** (when needed: a separate template repo, not a flag)

### F14 — Fleet-level dashboard / web UI
- First-party caller TODAY? **None — the GH issues are the dashboard.**
- Reinvents? **Yes — GitHub itself.**
- **VERDICT: CUT**

### F15 — Plugin / extension system for custom skills
- First-party caller TODAY? **None.**
- Reinvents? **Arguably — Claude Code skills already exist as a primitive.**
- **VERDICT: CUT** (anti-pattern per project philosophy: "no plugin architecture for v0.1")

### F16 — Auto-publish releases (npm/cargo/PyPI)
- First-party caller TODAY? **release-please already handles npm publish per repo via Trusted Publishers; multi-registry is `agent-publish`'s job.**
- **VERDICT: CUT** (out of scope)

### F17 — Launch-day announcement composition
- First-party caller TODAY? **`agent-launch`'s job.**
- **VERDICT: CUT** (out of scope)

### F18 — Tick that opens PRs (e.g., propose dep bumps directly)
- First-party caller TODAY? **None — Renovate already opens dep-bump PRs.**
- Primary use case dies without it? **No — issue with bullet list is enough for the human-in-the-loop.**
- Reinvents? **Yes — Renovate does this.**
- **VERDICT: CUT**

### F19 — Working-tree-aware tick (clone repo, read code)
- First-party caller TODAY? **None — `gh` API is sufficient for fleet review.**
- Primary use case dies without it? **No.**
- Reinvents? **Partially — claude-code-action does code review per-PR.**
- **VERDICT: CUT** (claude-code-action covers the code-review need per-repo)

---

## Summary

**IN-V0.1 (7):** F1 enroll · F2 tick · F3 fleet.yaml · F4 typescript-bun template · F5 cron workflow · F6 conformance · F7 demo

**DEFERRED-V0.2 (5):** F8 sync · F9 overrides · F10 Anthropic Scheduled Tasks · F11 cross-repo audits · F12 local-only mode

**CUT permanently (7):** F13 multi-lang · F14 dashboard · F15 plugins · F16 auto-publish · F17 launch · F18 tick-opens-PRs · F19 working-tree tick

This v0.1 fits the project philosophy: ONE problem (keep a fleet of TS+Bun OSS repos passively healthy), composed of mature primitives, ~5 source files, single binary deliverable, total runtime LoC < 600.
