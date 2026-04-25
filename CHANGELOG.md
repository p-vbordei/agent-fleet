# Changelog

All notable changes to agent-fleet will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-04-25

### Added

- `enroll <name>` — install the typescript-bun template kit (5 files: `ci.yml`, `claude-review.yml`, `release-please.yml`, `renovate.json`, `release-please-config.json`) into a fleet entry's target path. Idempotent.
- `tick [<name>]` — weekly per-repo health check via Anthropic SDK (`claude-opus-4-7`) with a single `bash` tool restricted to `gh`. Per repo: queries open PRs, stale issues, recent CI, Dependabot alerts; opens at most one summary issue.
- `fleet.yaml` strict Zod schema (4 required fields per entry; unknown keys rejected; only `typescript-bun` template id accepted in v0.1).
- Conformance vectors C1–C5 in `conformance/` (idempotency, bounded writes, at-most-one issue, read-only on code, strict YAML schema). Suite runs in <50 ms.
- Security tests S1, S5, S6 (secret hygiene, no-fetch in `enroll`, no token echo). S3 + S4 covered by sandbox tests + C4. S2 (PAT scope) documented in `docs/security/S2-pat-scope.md`.
- `bun build --compile` produces a single ~60 MB binary.
- GitHub Actions: `ci.yml` (test + tsc + compile + smoke), `tick.yml` (weekly Monday 09:00 UTC cron + manual dispatch).
- 76 tests across unit, integration, conformance, and security suites.
