import { describe, expect, test } from 'bun:test'
import { renderTickPrompt } from '../src/prompts'

describe('renderTickPrompt', () => {
  test('substitutes repo and ISO_DATE', () => {
    const out = renderTickPrompt({ repo: 'p-vbordei/agent-id', isoDate: '2026-04-25' })
    expect(out).toContain('p-vbordei/agent-id')
    expect(out).toContain('2026-04-25')
    expect(out).not.toContain('{{repo}}')
    expect(out).not.toContain('{{ISO_DATE}}')
  })

  test('mentions all four inspection categories from SPEC §4', () => {
    const out = renderTickPrompt({ repo: 'o/r', isoDate: '2026-04-25' })
    expect(out).toMatch(/Open PRs/)
    expect(out).toMatch(/Issues open 30\+/)
    expect(out).toMatch(/CI run/)
    expect(out).toMatch(/Dependabot/)
  })

  test('forbids non-gh commands and mutating gh subcommands', () => {
    const out = renderTickPrompt({ repo: 'o/r', isoDate: '2026-04-25' })
    expect(out).toContain('Do NOT modify')
    expect(out).toContain('AT MOST ONE issue')
  })
})
