import { test, expect } from 'bun:test'
import { enroll } from '../src/enroll'
import { mkdtempSync, rmSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const TPL = resolve(import.meta.dir, '..', 'templates')

function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {}
  function walk(d: string) {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else out[relative(dir, p)] = readFileSync(p, 'utf8')
    }
  }
  walk(dir)
  return out
}

test('C1 — running enroll twice produces byte-identical state', () => {
  const dir = mkdtempSync(join(tmpdir(), 'c1-'))
  try {
    const entry = {
      name: 'agent-id',
      repo: 'p-vbordei/agent-id',
      path: dir,
      template: 'typescript-bun' as const,
    }
    enroll(entry, TPL)
    const first = snapshot(dir)
    enroll(entry, TPL)
    const second = snapshot(dir)
    expect(second).toEqual(first)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
