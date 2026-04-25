# agent-fleet — design v0.1

**Date:** 2026-04-25
**Status:** DRAFT — awaiting Stage 1 approval

## Problem

A solo maintainer of a small family of TS+Bun OSS protocol/library repos (currently `agent-id`, `agent-ask`, with `agent-cid`, `agent-pay`, `agent-phone`, `agent-rerun`, `agent-rooms`, `agent-scroll`, `agent-toolprint` queued) cannot keep up with PR review, dep updates, security alerts, release cadence, and stale-issue triage across all of them by hand. Mature point tools exist for each axis (Renovate for deps, release-please for releases, claude-code-action for PR review, Socket/Semgrep for security) but they require per-repo install, drift over time, and have no cross-fleet view. Result: most repos go stale within weeks.

## What agent-fleet IS

A single Bun-compiled binary that does two thin things across a YAML-listed fleet of repos:

1. **enroll** — installs a fixed kit of standard automation files into a target repo (CI workflow, claude-code-action review workflow, Renovate config, release-please config, release workflow). Idempotent.
2. **tick** — runs once a week against every enrolled repo. Per repo: queries `gh` CLI for open PRs / recent CI / stale issues / Dependabot alerts, then opens ONE issue in the target repo titled "Weekly fleet review YYYY-MM-DD" with action items.

That's it. No daemon, no DB, no plugin system, no UI.

## What agent-fleet is NOT

- Not a release publisher. Releases run inside each target repo via release-please + npm Trusted Publishers. Multi-registry publishing is `agent-publish`'s problem.
- Not a code reviewer. PR-open code review is delegated to `anthropics/claude-code-action` running inside each enrolled repo's CI.
- Not a monorepo manager. Each enrolled repo stays standalone with its own CI, package.json, releases.
- Not multi-language. v0.1 supports TS+Bun only. Adding Rust/Python = future repo, not a flag.
- Not a launch agent (that's `agent-launch`).

## Architecture (KISS)

Single Bun binary. ~5 source files. ≤200 lines each.

```
agent-fleet/
├── README.md
├── SPEC.md
├── SCOPE.md
├── CHANGELOG.md
├── LICENSE                         # Apache 2.0
├── package.json
├── bunfig.toml
├── biome.json
├── tsconfig.json
├── fleet.yaml                      # the user's fleet config (committed)
├── src/
│   ├── index.ts                    # CLI entry, dispatch
│   ├── config.ts                   # fleet.yaml load + Zod validation
│   ├── enroll.ts                   # render templates → write to target
│   ├── tick.ts                     # tick logic (Anthropic SDK + gh tool)
│   └── prompts.ts                  # the one tick prompt as a typed string
├── templates/
│   └── typescript-bun/
│       ├── ci.yml
│       ├── claude-review.yml
│       ├── release-please.yml
│       ├── renovate.json
│       └── release-please-config.json
├── tests/
│   ├── enroll.test.ts
│   ├── config.test.ts
│   └── tick.test.ts                # mocks Anthropic + gh
├── conformance/
│   ├── C1-enroll-idempotent.test.ts
│   ├── C2-enroll-bounded-writes.test.ts
│   ├── C3-tick-at-most-one-issue.test.ts
│   ├── C4-tick-readonly.test.ts
│   └── C5-fleet-yaml-strict.test.ts
├── examples/
│   └── demo.ts                     # 20-line demo
├── docs/superpowers/
│   ├── specs/2026-04-25-agent-fleet-design.md
│   └── plans/                      # filled at Stage 2
└── .github/workflows/
    ├── ci.yml                      # bun install && bun test && bun build --compile
    └── tick.yml                    # cron: 0 9 * * 1 → bun run tick
```

Total runtime LoC target: < 600.

## fleet.yaml schema (v0.1)

```yaml
fleet:
  - name: agent-id
    repo: p-vbordei/agent-id
    path: ../agent-id
    template: typescript-bun
  - name: agent-ask
    repo: p-vbordei/agent-ask
    path: ../agent-ask
    template: typescript-bun
```

Required per entry: `name`, `repo`, `path`, `template`. No optional fields, strict mode (extra keys reject).

## CLI surface (v0.1)

```
agent-fleet enroll <name>     # apply template kit to fleet entry
agent-fleet tick [<name>]     # run tick against one or all enrolled repos
```

Two commands. Anything else (sync, drift, status, list) is DEFERRED.

## Trigger model — centralized GH Actions cron

For autonomous operation, a workflow `tick.yml` in agent-fleet's own repo runs `bun run tick` weekly with `ANTHROPIC_API_KEY` and `GH_TOKEN` (fine-grained PAT scoped to enrolled repos). We avoid the OIDC bug in `anthropics/claude-code-action` under `schedule:` triggers (issue #814) because we shell out to the Anthropic SDK directly — no OIDC dance needed.

Rejected alternatives:
- Anthropic Scheduled Tasks (managed cron) — fine, but locks you to Anthropic infra; revisit at v0.2 if GH cron flakes.
- Distributed (a tick workflow installed in each enrolled repo via enroll) — duplicates secret management across N repos and forecloses cross-fleet logic later.
- Local cron — needs the user's machine on, not robust.

## Tick semantics — API-only, one issue per repo

For each enrolled repo, one Anthropic SDK call (`claude-opus-4-7`) with:
- A single `bash` tool, restricted to commands matching `^gh ` (other commands rejected before exec).
- Prompt input variables: `{{repo}}` and `{{ISO_DATE}}`.
- Up to 10 tool turns.

The model's terminal action is either `gh issue create` (one issue) or no action ("no-findings" printed).

Tick has **no working tree** for the target repo. The model reasons exclusively from `gh` API output. This makes tick:
- Faster (no clone)
- Safer (no possibility of writes to working tree)
- Sufficient for the v0.1 deliverable (PR code review is already covered per-repo by claude-code-action)

## Trust & secrets

- `ANTHROPIC_API_KEY` and `GH_TOKEN` live in agent-fleet's GitHub Actions secrets. Never in fleet.yaml. Never logged.
- `GH_TOKEN` is a **fine-grained PAT** scoped only to repos in fleet.yaml. Permissions: PRs (read), Issues (read+write), Actions (read), Dependabot alerts (read).
- The `bash` tool surface during tick is restricted to `^gh ` commands at the SDK level — not as a prompt instruction.
- Templates are vendored at agent-fleet's HEAD; enroll never fetches over the network.

## Decisions taken (no further user input needed)

| Decision | Choice | Rejected alternatives |
|---|---|---|
| Form factor | Hybrid (scaffold + run), thin slice in both | scaffold-only, run-only |
| Stack | Bun + TS strict + Zod + Anthropic SDK | Node, Deno, Rust, Go |
| Trigger | GH Actions cron in agent-fleet repo | Anthropic Scheduled Tasks, distributed cron, local cron |
| Tick mode | API-only via `gh` tool | working-tree clone + code reads |
| Templates | One language: typescript-bun | multi-language flag |
| CLI verbs | enroll, tick | also sync, status, list |
| fleet.yaml | strict, no optionals | overrides, profiles |
| Output of tick | one issue per repo, max | PRs, comments, dispatch events |

## Conformance preview (Stage 4 detail)

- C1: enroll is idempotent (byte-identical writes on second run)
- C2: enroll never modifies files outside the template kit
- C3: tick creates ≤ 1 issue per repo per run
- C4: tick is read-only against repo state (no commits, PRs, comments, closes, assigns)
- C5: fleet.yaml with missing/extra/invalid fields fails fast

## Demo preview (Stage 5)

`examples/demo.ts` (≤ 20 lines): loads a 1-entry fleet.yaml, calls enroll then tick, prints the resulting issue URL. Runs against a real local agent-id checkout + a real GitHub repo, with `ANTHROPIC_API_KEY` and `GH_TOKEN` from env.

## Open questions

None blocking Stage 1. Implementation-level decisions (e.g., exact YAML library, exact prompt wording) will be locked in Stage 2 plan.
