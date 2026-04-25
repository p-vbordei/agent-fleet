import { test, expect } from 'bun:test'
import { enroll } from '../../src/enroll'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const TPL = resolve(import.meta.dir, '..', '..', 'templates')

test('S5 — enroll never invokes fetch', () => {
  const realFetch = globalThis.fetch
  let fetchCalled = false
  globalThis.fetch = (() => {
    fetchCalled = true
    throw new Error('S5 violation: enroll attempted fetch')
  }) as typeof fetch
  const dir = mkdtempSync(join(tmpdir(), 's5-'))
  try {
    enroll(
      { name: 'agent-id', repo: 'p-vbordei/agent-id', path: dir, template: 'typescript-bun' },
      TPL,
    )
    expect(fetchCalled).toBe(false)
  } finally {
    globalThis.fetch = realFetch
    rmSync(dir, { recursive: true, force: true })
  }
})
