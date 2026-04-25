import { test, expect, describe } from 'bun:test'
import { loadFleetConfig, FleetConfigError } from '../src/config'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function withTmp(yaml: string, fn: (path: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'c5-'))
  const p = join(dir, 'fleet.yaml')
  writeFileSync(p, yaml)
  try {
    fn(p)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('C5 — fleet.yaml strict schema', () => {
  test('rejects empty fleet array', () => {
    withTmp('fleet: []\n', (p) => expect(() => loadFleetConfig(p)).toThrow(FleetConfigError))
  })
  test('rejects missing fleet key', () => {
    withTmp('foo: bar\n', (p) => expect(() => loadFleetConfig(p)).toThrow(FleetConfigError))
  })
  test('rejects extra unknown top-level key', () => {
    withTmp('fleet: []\nextra: x\n', (p) =>
      expect(() => loadFleetConfig(p)).toThrow(FleetConfigError),
    )
  })
  test('rejects missing per-entry field (path)', () => {
    withTmp(
      `fleet:
  - name: x
    repo: o/r
    template: typescript-bun
`,
      (p) => expect(() => loadFleetConfig(p)).toThrow(/path/),
    )
  })
  test('rejects extra per-entry field', () => {
    withTmp(
      `fleet:
  - name: x
    repo: o/r
    path: ../x
    template: typescript-bun
    extra: y
`,
      (p) => expect(() => loadFleetConfig(p)).toThrow(),
    )
  })
  test('rejects unknown template id', () => {
    withTmp(
      `fleet:
  - name: x
    repo: o/r
    path: ../x
    template: rust-cargo
`,
      (p) => expect(() => loadFleetConfig(p)).toThrow(/template/),
    )
  })
  test('rejects empty string fields', () => {
    withTmp(
      `fleet:
  - name: ""
    repo: o/r
    path: ../x
    template: typescript-bun
`,
      (p) => expect(() => loadFleetConfig(p)).toThrow(/name/),
    )
  })
})
