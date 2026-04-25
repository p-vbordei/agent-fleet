import { test, expect, describe } from 'bun:test'
import { isAllowedCommand } from '../src/sandbox'

const FORBIDDEN_SAMPLES = [
  'gh pr create --title x',
  'gh pr close 1',
  'gh pr merge 1',
  'gh pr review 1 --approve',
  'gh issue close 1',
  'gh issue comment 1 --body x',
  'gh issue edit 1 --add-label x',
  'gh issue reopen 1',
  'gh release create v1',
  'gh release edit v1',
  'gh repo edit --description x',
  'gh repo delete o/r',
  'gh workflow run weekly',
  'gh secret set TOKEN --body x',
  'gh variable set FOO --body bar',
  'gh label create new',
  'gh api -X POST /repos/o/r/pulls -f title=x',
  'gh api -X DELETE /repos/o/r/issues/1/comments/2',
  'gh api -X PATCH /repos/o/r/issues/1 -f state=closed',
  'gh api -X PUT /repos/o/r/contents/README.md -f content=x',
]

describe('C4 — tick read-only on code', () => {
  for (const cmd of FORBIDDEN_SAMPLES) {
    test(`rejects: ${cmd}`, () => {
      expect(isAllowedCommand(cmd).allowed).toBe(false)
    })
  }
  test('allows reading PR list, issue list, run list, dependabot alerts', () => {
    for (const c of [
      'gh pr list --state open',
      'gh issue list --state open',
      'gh run list --limit 1',
      'gh api repos/o/r/dependabot/alerts',
    ]) {
      expect(isAllowedCommand(c).allowed).toBe(true)
    }
  })
  test('allows the one mutating gh we permit: issue create', () => {
    expect(isAllowedCommand('gh issue create --repo o/r --title T --body B').allowed).toBe(true)
    expect(isAllowedCommand('gh api -X POST /repos/o/r/issues -f title=T').allowed).toBe(true)
  })
})
