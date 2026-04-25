import { readFileSync } from 'node:fs'
import { load } from 'js-yaml'
import { z } from 'zod'

export class FleetConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FleetConfigError'
  }
}

const FleetEntrySchema = z
  .object({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'name must match ^[a-z0-9][a-z0-9-]*$'),
    repo: z.string().regex(/^[^/]+\/[^/]+$/, 'repo must be "owner/name"'),
    path: z.string().min(1),
    template: z.literal('typescript-bun'),
  })
  .strict()

const FleetConfigSchema = z
  .object({
    fleet: z.array(FleetEntrySchema).min(1, 'fleet must contain at least one entry'),
  })
  .strict()

export type FleetEntry = z.infer<typeof FleetEntrySchema>
export type FleetConfig = z.infer<typeof FleetConfigSchema>

export function loadFleetConfig(path: string): FleetConfig {
  let raw: unknown
  try {
    raw = load(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new FleetConfigError(`failed to read or parse ${path}: ${(err as Error).message}`)
  }
  const result = FleetConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    throw new FleetConfigError(`invalid fleet.yaml: ${issues}`)
  }
  return result.data
}
