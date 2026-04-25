# S2 — Fine-grained PAT scope (operational)

agent-fleet's `tick` requires a `GH_TOKEN` that is a GitHub fine-grained Personal Access Token (PAT) scoped only to the repos listed in `fleet.yaml`. This is operational guidance — there is no test that can enforce token shape from outside.

## Required permissions

| Permission | Read | Write | Reason |
|---|---|---|---|
| Pull requests | ✓ |  | List open PRs |
| Issues | ✓ | ✓ | List existing, create the weekly review issue |
| Actions | ✓ |  | Read CI run status |
| Dependabot alerts | ✓ |  | List open alerts |
| Metadata | ✓ |  | Required by GitHub for any fine-grained PAT |

NO permissions for: contents (write), workflows (write), administration, secrets, packages, deployments, environments.

## Required repository selection

Select **only** the repos listed in `fleet.yaml`. Do NOT grant access to "All repositories".

## How to create

1. Open https://github.com/settings/personal-access-tokens/new
2. Token name: `agent-fleet-tick`
3. Expiration: 90 days (max). Renew via the same flow.
4. Repository access: "Only select repositories" → the fleet list.
5. Permissions: as above.
6. Add the resulting token as a GitHub Actions secret named `AGENT_FLEET_PAT` in the agent-fleet repo (the workflow `.github/workflows/tick.yml` reads it under that name and exposes it to `tick` as `GH_TOKEN`).

## Why fine-grained, not classic

Classic PATs grant org-wide access. Fine-grained PATs are scoped to repos, scoped to permission categories, and have explicit expiry. The blast radius of a leaked fine-grained PAT is bounded; a classic PAT can do anything you can do.

## Why a separate PAT, not GITHUB_TOKEN

`GITHUB_TOKEN` (the workflow's auto-generated token) is scoped to the **current** repo only. agent-fleet needs to query and create issues in **other** repos, so `GITHUB_TOKEN` won't work; a PAT is required.
