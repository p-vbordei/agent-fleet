// gh subcommand prefixes that are forbidden because they mutate code/PRs/existing issues.
const FORBIDDEN_GH_PREFIXES = [
  'gh pr create',
  'gh pr close',
  'gh pr merge',
  'gh pr review',
  'gh pr edit',
  'gh issue close',
  'gh issue comment',
  'gh issue edit',
  'gh issue reopen',
  'gh issue delete',
  'gh release create',
  'gh release edit',
  'gh release delete',
  'gh release upload',
  'gh repo edit',
  'gh repo delete',
  'gh repo archive',
  'gh repo clone',
  'gh repo create',
  'gh repo fork',
  'gh repo rename',
  'gh repo sync',
  'gh workflow run',
  'gh workflow disable',
  'gh workflow enable',
  'gh secret set',
  'gh secret delete',
  'gh variable set',
  'gh variable delete',
  'gh label create',
  'gh label edit',
  'gh label delete',
]

// gh api -X POST allowed only against this path family (issue creation).
const ALLOWED_API_POST_PREFIXES = [/^\/?repos\/[^/]+\/[^/]+\/issues(\?|$)/]
const MUTATING_API_FLAGS = /-X\s+(POST|PUT|PATCH|DELETE)\b/

// Shell metacharacters that could enable command injection beyond the gh prefix.
const SHELL_METACHARS = /[|&;`$<>(){}\\]/

export type AllowResult = { allowed: true } | { allowed: false; reason: string }

export function isAllowedCommand(cmd: string): AllowResult {
  const trimmed = cmd.trim()
  if (trimmed.length === 0) {
    return { allowed: false, reason: 'empty command' }
  }
  if (SHELL_METACHARS.test(trimmed)) {
    return { allowed: false, reason: 'shell metacharacters not permitted' }
  }
  if (!trimmed.startsWith('gh ') && trimmed !== 'gh') {
    return { allowed: false, reason: 'non-gh command rejected' }
  }
  for (const prefix of FORBIDDEN_GH_PREFIXES) {
    if (trimmed === prefix || trimmed.startsWith(`${prefix} `)) {
      return { allowed: false, reason: `forbidden gh subcommand: ${prefix}` }
    }
  }
  if (trimmed.startsWith('gh api') && MUTATING_API_FLAGS.test(trimmed)) {
    const pathMatch = trimmed.match(/gh api(?:\s+-X\s+\w+)?\s+(\S+)/)
    const path = pathMatch?.[1] ?? ''
    if (!ALLOWED_API_POST_PREFIXES.some((re) => re.test(path))) {
      return { allowed: false, reason: `forbidden mutating gh api path: ${path}` }
    }
  }
  return { allowed: true }
}
