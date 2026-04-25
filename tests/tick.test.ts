import { describe, expect, test } from 'bun:test'
import { tickOne, type TickDeps } from '../src/tick'
import type { FleetEntry } from '../src/config'

const entry: FleetEntry = {
  name: 'agent-id',
  repo: 'o/r',
  path: '../r',
  template: 'typescript-bun',
}

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: { command: string } }

function makeFakeClient(
  scripts: Block[][],
  capture?: (priorMessages: unknown[]) => void,
) {
  let callCount = 0
  return {
    messages: {
      create: async (params: unknown) => {
        const p = params as { messages: unknown[] }
        if (capture) capture(p.messages)
        const blocks = scripts[callCount] ?? [{ type: 'text' as const, text: 'done' }]
        callCount++
        const stop_reason = blocks.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn'
        return { content: blocks, stop_reason, model: 'claude-opus-4-7', usage: {} }
      },
    },
  }
}

describe('tickOne', () => {
  test('returns no-findings when model emits text without tool calls', async () => {
    const deps: TickDeps = {
      anthropic: makeFakeClient([[{ type: 'text', text: 'no-findings' }]]),
      exec: () => ({ stdout: '', stderr: '', code: 0 }),
      now: () => new Date('2026-04-25T09:00:00Z'),
    }
    const r = await tickOne(entry, deps)
    expect(r.outcome).toBe('no-findings')
  })

  test('returns issue-created with URL when model creates an issue', async () => {
    const deps: TickDeps = {
      anthropic: makeFakeClient([
        [
          {
            type: 'tool_use',
            id: 't1',
            name: 'bash',
            input: {
              command:
                'gh issue create --repo o/r --title "Weekly fleet review 2026-04-25" --body "..."',
            },
          },
        ],
        [{ type: 'text', text: 'done' }],
      ]),
      exec: (cmd) => {
        if (cmd.includes('gh issue create')) {
          return { stdout: 'https://github.com/o/r/issues/42\n', stderr: '', code: 0 }
        }
        return { stdout: '', stderr: '', code: 0 }
      },
      now: () => new Date('2026-04-25T09:00:00Z'),
    }
    const r = await tickOne(entry, deps)
    expect(r.outcome).toBe('issue-created')
    if (r.outcome === 'issue-created') {
      expect(r.url).toBe('https://github.com/o/r/issues/42')
    }
  })

  test('refuses forbidden tool call and surfaces error to model', async () => {
    let secondCallMessages: unknown[] = []
    const deps: TickDeps = {
      anthropic: makeFakeClient(
        [
          [
            {
              type: 'tool_use',
              id: 't1',
              name: 'bash',
              input: { command: 'gh pr create --title evil' },
            },
          ],
          [{ type: 'text', text: 'no-findings' }],
        ],
        (msgs) => {
          if (msgs.length > 1) secondCallMessages = msgs
        },
      ),
      exec: () => {
        throw new Error('exec must not be called for forbidden cmd')
      },
      now: () => new Date('2026-04-25T09:00:00Z'),
    }
    const r = await tickOne(entry, deps)
    expect(r.outcome).toBe('no-findings')
    const serialized = JSON.stringify(secondCallMessages)
    expect(serialized).toMatch(/forbidden/)
    expect(serialized).toMatch(/is_error/)
  })

  test('refuses non-gh command and surfaces error to model', async () => {
    const deps: TickDeps = {
      anthropic: makeFakeClient([
        [
          { type: 'tool_use', id: 't1', name: 'bash', input: { command: 'rm -rf /' } },
        ],
        [{ type: 'text', text: 'no-findings' }],
      ]),
      exec: () => {
        throw new Error('exec must not be called for non-gh')
      },
      now: () => new Date('2026-04-25T09:00:00Z'),
    }
    const r = await tickOne(entry, deps)
    expect(r.outcome).toBe('no-findings')
  })

  test('returns error if budget exhausted', async () => {
    // Returns tool_use forever — after MAX_TURNS we should error out.
    const deps: TickDeps = {
      anthropic: {
        messages: {
          create: async () => ({
            content: [{ type: 'tool_use', id: 't', name: 'bash', input: { command: 'gh pr list' } }],
            stop_reason: 'tool_use',
          }),
        },
      },
      exec: () => ({ stdout: '[]', stderr: '', code: 0 }),
      now: () => new Date('2026-04-25T09:00:00Z'),
    }
    const r = await tickOne(entry, deps)
    expect(r.outcome).toBe('error')
  })
})
