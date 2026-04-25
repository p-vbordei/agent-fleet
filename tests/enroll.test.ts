import { describe, expect, test } from 'bun:test'
import { enroll, EnrollError } from '../src/enroll'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { FleetEntry } from '../src/config'

const TEMPLATES_ROOT = resolve(import.meta.dir, '..', 'templates')

const sampleEntry: FleetEntry = {
  name: 'agent-id',
  repo: 'p-vbordei/agent-id',
  path: '',
  template: 'typescript-bun',
}

function withTmpDir(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'agent-fleet-target-'))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('enroll', () => {
  test('writes renovate.json to target', () => {
    withTmpDir((dir) => {
      enroll({ ...sampleEntry, path: dir }, TEMPLATES_ROOT)
      expect(existsSync(join(dir, 'renovate.json'))).toBe(true)
      const content = JSON.parse(readFileSync(join(dir, 'renovate.json'), 'utf8'))
      expect(content.$schema).toBe('https://docs.renovatebot.com/renovate-schema.json')
    })
  })

  test('idempotent: second enroll yields identical content (C1)', () => {
    withTmpDir((dir) => {
      enroll({ ...sampleEntry, path: dir }, TEMPLATES_ROOT)
      const first = readFileSync(join(dir, 'renovate.json'), 'utf8')
      enroll({ ...sampleEntry, path: dir }, TEMPLATES_ROOT)
      const second = readFileSync(join(dir, 'renovate.json'), 'utf8')
      expect(second).toBe(first)
    })
  })

  test('rejects missing target dir', () => {
    expect(() => enroll({ ...sampleEntry, path: '/no/such/dir' }, TEMPLATES_ROOT)).toThrow(
      EnrollError,
    )
  })

  test('returns the list of relative paths written', () => {
    withTmpDir((dir) => {
      const result = enroll({ ...sampleEntry, path: dir }, TEMPLATES_ROOT)
      expect(result.written).toContain('renovate.json')
    })
  })
})
