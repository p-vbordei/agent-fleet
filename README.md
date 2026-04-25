# agent-fleet

> One config, one cron, N OSS repos kept reviewed, dep-current, and release-ready. Single Bun binary. No daemon. No DB.

**Status:** v0.0.0 — under construction. See [SCOPE.md](./SCOPE.md), [SPEC.md](./SPEC.md), [docs/superpowers/specs/](./docs/superpowers/specs/).

## What it does

Two thin commands across a YAML-listed fleet of TS+Bun OSS repos:

- **`enroll`** — drops `.github/workflows/{ci,claude-review,release-please}.yml`, `renovate.json`, and `release-please-config.json` into a target repo. Idempotent.
- **`tick`** — weekly cron-driven health check. Per repo: opens one GitHub issue summarizing stale PRs, old issues, recent CI failures, and open Dependabot alerts. No code reads, no PRs.

That's the whole product.

## Quickstart (target shape, not yet implemented)

```bash
bun install
$EDITOR fleet.yaml          # list your repos
bun run agent-fleet enroll agent-id    # install standard kit into ../agent-id
bun run agent-fleet tick               # one issue per enrolled repo
```

Then push `agent-fleet` to GitHub and add `ANTHROPIC_API_KEY` + a fine-grained `GH_TOKEN` as Actions secrets. The bundled `tick.yml` workflow runs every Monday at 09:00 UTC.

## What it is NOT

- Not a release publisher — that's `agent-publish`.
- Not a launch-day agent — that's `agent-launch`.
- Not a code reviewer — delegated to `anthropics/claude-code-action` running per-repo (installed by `enroll`).
- Not a monorepo tool. Each enrolled repo stays standalone.
- Not multi-language. v0.1 is TS+Bun only.

## Family

`agent-fleet` is one of three sibling repos for autonomous OSS maintenance — see [`../multi-oss-launch-and-maintain/`](../multi-oss-launch-and-maintain/) for the coordination hub, roadmap, and shared decisions across:

- **`agent-fleet`** — keeps repos passively healthy (this repo)
- **`agent-publish`** — multi-registry release CLI (v0.1: npm + GH release; cargo / PyPI / Homebrew / Docker in later versions)
- **`agent-launch`** — release-day announcement drafter (HN / Reddit / X / Mastodon / LinkedIn — v0.1 drafts only)
- **`agent-orchestra`** (working name; the `multi-oss-launch-and-maintain/` folder, future) — composes all three into an end-to-end "ship a new version" workflow.

## License

Apache 2.0 — see [LICENSE](./LICENSE).
