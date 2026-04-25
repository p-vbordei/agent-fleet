import {
  readdirSync,
  statSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import Mustache from 'mustache'
import type { FleetEntry } from './config'

export class EnrollError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnrollError'
  }
}

function walk(root: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(root)) {
    const full = join(root, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

export function enroll(entry: FleetEntry, templatesRoot: string): { written: string[] } {
  if (!existsSync(entry.path) || !statSync(entry.path).isDirectory()) {
    throw new EnrollError(`target path does not exist or is not a directory: ${entry.path}`)
  }
  const tplDir = join(templatesRoot, entry.template)
  if (!existsSync(tplDir)) {
    throw new EnrollError(`template not found: ${entry.template} (looked in ${tplDir})`)
  }
  const vars = { name: entry.name, repo: entry.repo }
  const written: string[] = []
  for (const src of walk(tplDir)) {
    const rel = relative(tplDir, src)
    const dest = join(entry.path, rel)
    const raw = readFileSync(src, 'utf8')
    const rendered = Mustache.render(raw, vars)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, rendered)
    written.push(rel)
  }
  return { written }
}
