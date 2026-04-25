import { describe, expect, test } from 'bun:test'
import { isAllowedCommand } from '../src/sandbox'

describe('isAllowedCommand (S3 gh-only sandbox)', () => {
  test('allows gh pr list', () => {
    expect(isAllowedCommand('gh pr list --state open --json number,title')).toEqual({
      allowed: true,
    })
  })
  test('allows gh issue create (the one mutation we want)', () => {
    expect(isAllowedCommand('gh issue create --repo o/r --title T --body B')).toEqual({
      allowed: true,
    })
  })
  test('rejects non-gh command (S3)', () => {
    const r = isAllowedCommand('rm -rf /')
    expect(r.allowed).toBe(false)
    if (!r.allowed) expect(r.reason).toMatch(/non-gh/i)
  })
  test('rejects gh pr create (mutation, S4 / C4)', () => {
    const r = isAllowedCommand('gh pr create --title X')
    expect(r.allowed).toBe(false)
    if (!r.allowed) expect(r.reason).toMatch(/forbidden/i)
  })
  test('rejects gh issue close (mutation, C4)', () => {
    expect(isAllowedCommand('gh issue close 42').allowed).toBe(false)
  })
  test('rejects gh issue comment (mutation, C4)', () => {
    expect(isAllowedCommand('gh issue comment 42 --body x').allowed).toBe(false)
  })
  test('rejects gh release create (mutation, C4)', () => {
    expect(isAllowedCommand('gh release create v1.0').allowed).toBe(false)
  })
  test('rejects gh api -X POST against /repos/.../pulls', () => {
    expect(isAllowedCommand('gh api -X POST /repos/o/r/pulls -f title=x').allowed).toBe(false)
  })
  test('rejects gh api -X PATCH against /repos/.../issues/1 (closing existing)', () => {
    expect(isAllowedCommand('gh api -X PATCH /repos/o/r/issues/1 -f state=closed').allowed).toBe(
      false,
    )
  })
  test('rejects gh api -X DELETE', () => {
    expect(isAllowedCommand('gh api -X DELETE /repos/o/r/issues/1/comments/2').allowed).toBe(false)
  })
  test('allows gh api GET (no -X) against any path', () => {
    expect(isAllowedCommand('gh api repos/o/r/dependabot/alerts').allowed).toBe(true)
  })
  test('allows gh api -X POST /repos/o/r/issues (the one POST we permit)', () => {
    expect(isAllowedCommand('gh api -X POST /repos/o/r/issues -f title=x').allowed).toBe(true)
  })
  test('rejects empty command', () => {
    expect(isAllowedCommand('').allowed).toBe(false)
  })
  test('rejects command with shell pipe (potential injection)', () => {
    expect(isAllowedCommand('gh pr list | rm -rf /').allowed).toBe(false)
  })
  test('rejects command with shell substitution', () => {
    expect(isAllowedCommand('gh pr list $(rm -rf /)').allowed).toBe(false)
  })
})
