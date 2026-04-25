import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CLI = resolve(import.meta.dir, '..', 'src', 'index.ts')

function runCli(args: string[], cwd: string): { stdout: string; stderr: string; code: number } {
  const result = spawnSync('bun', ['run', CLI, ...args], {
    cwd,
    encoding: 'utf8',
  })
  return { stdout: result.stdout, stderr: result.stderr, code: result.status ?? -1 }
}

describe('CLI dispatch', () => {
  test('enroll command writes templates into target', () => {
    const work = mkdtempSync(join(tmpdir(), 'agent-fleet-cli-'))
    const target = mkdtempSync(join(tmpdir(), 'agent-fleet-target-'))
    writeFileSync(
      join(work, 'fleet.yaml'),
      `fleet:
  - name: x
    repo: o/r
    path: ${target}
    template: typescript-bun
`,
    )
    try {
      const { code, stdout } = runCli(['enroll', 'x'], work)
      expect(code).toBe(0)
      expect(stdout).toContain('enrolled x')
      expect(existsSync(join(target, 'renovate.json'))).toBe(true)
    } finally {
      rmSync(work, { recursive: true, force: true })
      rmSync(target, { recursive: true, force: true })
    }
  })

  test('enroll exits 1 when name not in fleet.yaml', () => {
    const work = mkdtempSync(join(tmpdir(), 'agent-fleet-cli-'))
    writeFileSync(
      join(work, 'fleet.yaml'),
      `fleet:
  - name: a
    repo: o/r
    path: /tmp/x
    template: typescript-bun
`,
    )
    try {
      const { code } = runCli(['enroll', 'b'], work)
      expect(code).toBe(1)
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  })

  test('enroll exits 1 when fleet.yaml missing', () => {
    const work = mkdtempSync(join(tmpdir(), 'agent-fleet-cli-'))
    try {
      const { code } = runCli(['enroll', 'x'], work)
      expect(code).toBe(1)
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  })

  test('exits 64 with usage on missing command', () => {
    const work = mkdtempSync(join(tmpdir(), 'agent-fleet-cli-'))
    writeFileSync(
      join(work, 'fleet.yaml'),
      `fleet:
  - name: a
    repo: o/r
    path: /tmp/x
    template: typescript-bun
`,
    )
    try {
      const { code } = runCli([], work)
      expect(code).toBe(64)
    } finally {
      rmSync(work, { recursive: true, force: true })
    }
  })
})
