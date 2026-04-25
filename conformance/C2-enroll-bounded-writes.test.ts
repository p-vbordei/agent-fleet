import { test, expect } from 'bun:test'
import { enroll } from '../src/enroll'
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const TPL = resolve(import.meta.dir, '..', 'templates')

const EXPECTED_KIT = new Set([
  'renovate.json',
  'release-please-config.json',
  '.github/workflows/ci.yml',
  '.github/workflows/claude-review.yml',
  '.github/workflows/release-please.yml',
])

test('C2 — enroll only writes the 5 declared kit files; preserves unrelated files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'c2-'))
  try {
    writeFileSync(join(dir, 'README.md'), '# pre-existing\n')
    enroll(
      { name: 'agent-id', repo: 'p-vbordei/agent-id', path: dir, template: 'typescript-bun' },
      TPL,
    )
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('# pre-existing\n')
    const added = new Set<string>()
    function walk(d: string) {
      for (const name of readdirSync(d)) {
        const p = join(d, name)
        const rel = relative(dir, p)
        if (statSync(p).isDirectory()) walk(p)
        else if (rel !== 'README.md') added.add(rel)
      }
    }
    walk(dir)
    expect(added).toEqual(EXPECTED_KIT)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
