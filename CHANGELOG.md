# Changelog

All notable changes to agent-fleet will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-04-27

### Fixed
- **enroll now bootstraps `.release-please-manifest.json`** from the target's `package.json` version. release-please-action@v4 requires this file to exist; it does NOT auto-create. Without this fix, the first push after `enroll` fails the Release Please workflow with "Missing required manifest versions". Discovered via live test on agent-id.

### Changed
- Template `ci.yml` is now language-shape-aware: `typecheck`, `lint`, `conformance` run conditionally on the presence of the corresponding `package.json` script (works for both libraries and CLIs). The build step (`bun build --compile`) only runs when `package.json` declares a `bin`. This avoids regressions on libraries (e.g., agent-id) that have no entry binary.

## [0.1.3] - 2026-04-27

### Changed
- **npm package renamed from `agent-fleetctl` to `@p-vbordei/agent-fleet`** now that the `p-vbordei` org exists on npm. The binary name (`agent-fleet`) is unchanged. Install: `npm i -g @p-vbordei/agent-fleet`. The unscoped `agent-fleetctl` is deprecated and points here.

## [0.1.2] - 2026-04-27

### Added
- `author`, `homepage`, `repository`, `bugs` fields in package.json so the npm page links back to the GitHub source and identifies Vlad Bordei <bordeivlad@gmail.com> as author. No code changes. (This entry was retroactively added; the v0.1.2 git tag exists but this version was never published to npm.)

## [0.1.1] - 2026-04-27

### Changed
- **npm package renamed from `agent-fleet` to `agent-fleetctl`**. The unscoped name `agent-fleet` was already taken on the npm registry by an unrelated project. The GitHub repo (`p-vbordei/agent-fleet`) and the installed binary (`agent-fleet`) keep their names. To install: `npm i -g agent-fleetctl`.

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
