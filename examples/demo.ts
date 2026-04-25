// agent-fleet demo — runs in <1s, no API keys required.
// Loads a 1-entry fleet, enrolls it into a tmpdir, prints the files written.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { loadFleetConfig } from '../src/config'
import { enroll } from '../src/enroll'

const cfg = loadFleetConfig(resolve(import.meta.dir, 'demo-fleet.yaml'))
const target = mkdtempSync(`${tmpdir()}/agent-fleet-demo-`)
const entry = { ...cfg.fleet[0]!, path: target }
const { written } = enroll(entry, resolve(import.meta.dir, '..', 'templates'))
console.log(`Enrolled ${entry.name}: ${written.length} files written to ${target}`)
for (const f of written) console.log(`  - ${f}`)
rmSync(target, { recursive: true, force: true })
