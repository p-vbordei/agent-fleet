import { resolve } from 'node:path'
import { loadFleetConfig, FleetConfigError } from './config'
import { enroll, EnrollError } from './enroll'
import type { TickDeps } from './tick'

const TEMPLATES_ROOT = resolve(import.meta.dir, '..', 'templates')

function usage(): never {
  console.error('Usage: agent-fleet <enroll|tick> [args]')
  process.exit(64)
}

async function main() {
  const [, , cmd, ...rest] = process.argv
  if (!cmd) usage()

  const cfgPath = resolve(process.cwd(), 'fleet.yaml')
  let cfg
  try {
    cfg = loadFleetConfig(cfgPath)
  } catch (err) {
    if (err instanceof FleetConfigError) {
      console.error(err.message)
      process.exit(1)
    }
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`fleet.yaml not found at ${cfgPath}`)
      process.exit(1)
    }
    throw err
  }

  if (cmd === 'enroll') {
    const name = rest[0]
    if (!name) {
      console.error('enroll requires <name>')
      process.exit(1)
    }
    const entry = cfg.fleet.find((e) => e.name === name)
    if (!entry) {
      console.error(`fleet entry not found: ${name}`)
      process.exit(1)
    }
    try {
      const { written } = enroll(entry, TEMPLATES_ROOT)
      console.log(`enrolled ${name}: ${written.length} files written`)
      process.exit(0)
    } catch (err) {
      if (err instanceof EnrollError) {
        console.error(err.message)
        process.exit(2)
      }
      console.error((err as Error).message)
      process.exit(3)
    }
  }

  if (cmd === 'tick') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const { spawnSync } = await import('node:child_process')
    const { tickOne } = await import('./tick')
    const filter = rest[0]
    const entries = filter ? cfg.fleet.filter((e) => e.name === filter) : cfg.fleet
    if (entries.length === 0) {
      console.error(`no fleet entries match: ${filter}`)
      process.exit(1)
    }
    const apiKey = process.env['ANTHROPIC_API_KEY']
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set')
      process.exit(4)
    }
    const client = new Anthropic({ apiKey })
    let anyError = false
    for (const entry of entries) {
      try {
        const result = await tickOne(entry, {
          anthropic: client as unknown as TickDeps['anthropic'],
          exec: (c) => {
            // shell:true is safe because src/sandbox.ts rejects shell metachars
            // (|&;<>(){}\\$`) before we get here.
            const r = spawnSync(c, { shell: true, encoding: 'utf8' })
            return {
              stdout: typeof r.stdout === 'string' ? r.stdout : '',
              stderr: typeof r.stderr === 'string' ? r.stderr : '',
              code: r.status ?? -1,
            }
          },
          now: () => new Date(),
        })
        if (result.outcome === 'issue-created') {
          console.log(`tick ${entry.name}: issue-created ${result.url}`)
        } else if (result.outcome === 'no-findings') {
          console.log(`tick ${entry.name}: no-findings`)
        } else {
          anyError = true
          console.log(`tick ${entry.name}: error ${result.message}`)
        }
      } catch (err) {
        anyError = true
        console.log(`tick ${entry.name}: error ${(err as Error).message}`)
      }
    }
    process.exit(anyError ? 1 : 0)
  }

  usage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
