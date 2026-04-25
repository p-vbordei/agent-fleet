import { describe, expect, test } from 'bun:test'
import { loadFleetConfig, FleetConfigError } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmpFile(content: string, fn: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'agent-fleet-'))
  const path = join(dir, 'fleet.yaml')
  writeFileSync(path, content)
  try {
    fn(path)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('loadFleetConfig', () => {
  test('parses a valid 1-entry fleet.yaml', () => {
    const yaml = `fleet:
  - name: agent-id
    repo: p-vbordei/agent-id
    path: ../agent-id
    template: typescript-bun
`
    withTmpFile(yaml, (path) => {
      const cfg = loadFleetConfig(path)
      expect(cfg.fleet).toHaveLength(1)
      expect(cfg.fleet[0]).toEqual({
        name: 'agent-id',
        repo: 'p-vbordei/agent-id',
        path: '../agent-id',
        template: 'typescript-bun',
      })
    })
  })

  test('rejects empty fleet array', () => {
    withTmpFile('fleet: []\n', (path) => {
      expect(() => loadFleetConfig(path)).toThrow(FleetConfigError)
    })
  })

  test('rejects missing required field (path)', () => {
    const yaml = `fleet:
  - name: x
    repo: o/r
    template: typescript-bun
`
    withTmpFile(yaml, (path) => {
      expect(() => loadFleetConfig(path)).toThrow(/path/)
    })
  })

  test('rejects unknown template', () => {
    const yaml = `fleet:
  - name: x
    repo: o/r
    path: ../r
    template: rust-cargo
`
    withTmpFile(yaml, (path) => {
      expect(() => loadFleetConfig(path)).toThrow(/template/)
    })
  })

  test('rejects extra unknown keys (strict mode)', () => {
    const yaml = `fleet:
  - name: x
    repo: o/r
    path: ../r
    template: typescript-bun
    extra: nope
`
    withTmpFile(yaml, (path) => {
      expect(() => loadFleetConfig(path)).toThrow(/extra|unknown|unrecognized/i)
    })
  })

  test('rejects invalid name pattern (uppercase)', () => {
    const yaml = `fleet:
  - name: Agent_ID
    repo: o/r
    path: ../r
    template: typescript-bun
`
    withTmpFile(yaml, (path) => {
      expect(() => loadFleetConfig(path)).toThrow(/name/)
    })
  })

  test('rejects malformed repo (no slash)', () => {
    const yaml = `fleet:
  - name: x
    repo: norepo
    path: ../r
    template: typescript-bun
`
    withTmpFile(yaml, (path) => {
      expect(() => loadFleetConfig(path)).toThrow(/repo/)
    })
  })
})
