import { resolve } from 'node:path'
import { loadFleetConfig, FleetConfigError } from './config'
import { enroll, EnrollError } from './enroll'

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
    console.error('tick: not yet implemented (Stage 2.2)')
    process.exit(2)
  }

  usage()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
