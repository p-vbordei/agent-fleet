import { test, expect, describe } from 'bun:test'
import { renderTickPrompt } from '../../src/prompts'
import { isAllowedCommand } from '../../src/sandbox'

describe('S1 + S6 — secret hygiene', () => {
  test('rendered tick prompt contains no secret-like patterns from env', () => {
    process.env['GH_TOKEN'] = 'ghp_FAKE_FOR_TEST_DO_NOT_USE'
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-FAKE'
    try {
      const out = renderTickPrompt({ repo: 'o/r', isoDate: '2026-04-25' })
      expect(out).not.toContain('ghp_')
      expect(out).not.toContain('sk-ant-')
    } finally {
      delete process.env['GH_TOKEN']
      delete process.env['ANTHROPIC_API_KEY']
    }
  })

  test('sandbox does not echo secret material in rejection reasons', () => {
    const r = isAllowedCommand('gh api repos/o/r --header "Authorization: token ghp_LEAK_TEST"')
    if (!r.allowed) {
      // We don't assert allow/deny — we assert that if a reason is produced it
      // does NOT carry the secret-looking substring through.
      expect(r.reason).not.toContain('ghp_LEAK_TEST')
    }
  })

  test('sandbox rejects pasted Authorization header injection cleanly', () => {
    // Containing a $ from "${TOKEN}" should already be rejected as shell metachar
    expect(isAllowedCommand('gh api /repos/o/r --header "Auth: ${TOKEN}"').allowed).toBe(false)
  })
})
