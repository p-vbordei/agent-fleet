import { test, expect } from 'bun:test'
import { tickOne } from '../src/tick'

test('C3 — even if model attempts 2 issue creates, only 1 issue actually runs', async () => {
  let issueCreates = 0
  const deps = {
    anthropic: {
      messages: {
        create: async (params: unknown) => {
          // Look at how many issue-create tool_results we've already seen in the
          // conversation to decide what to script next.
          const p = params as { messages: Array<{ role: string; content: unknown }> }
          const seenSecond = JSON.stringify(p.messages).includes('only one issue')
          if (seenSecond) {
            return {
              content: [{ type: 'text', text: 'done' }],
              stop_reason: 'end_turn',
            }
          }
          // First two assistant turns: each requests an issue create.
          // After C3 interlock kicks in on the 2nd, model gives up.
          const isFirstCall =
            !JSON.stringify(p.messages).includes('https://github.com/o/r/issues/')
          if (isFirstCall) {
            return {
              content: [
                {
                  type: 'tool_use',
                  id: 'a',
                  name: 'bash',
                  input: { command: 'gh issue create --repo o/r --title T1 --body B1' },
                },
              ],
              stop_reason: 'tool_use',
            }
          }
          return {
            content: [
              {
                type: 'tool_use',
                id: 'b',
                name: 'bash',
                input: { command: 'gh issue create --repo o/r --title T2 --body B2' },
              },
            ],
            stop_reason: 'tool_use',
          }
        },
      },
    },
    exec: (cmd: string) => {
      if (cmd.includes('gh issue create')) {
        issueCreates++
        return {
          stdout: `https://github.com/o/r/issues/${issueCreates}\n`,
          stderr: '',
          code: 0,
        }
      }
      return { stdout: '', stderr: '', code: 0 }
    },
    now: () => new Date('2026-04-25T09:00:00Z'),
  }
  const r = await tickOne(
    { name: 'a', repo: 'o/r', path: '../r', template: 'typescript-bun' },
    deps,
  )
  // C3: at most ONE actual issue create, regardless of how many attempts the model made.
  expect(issueCreates).toBe(1)
  expect(r.outcome).toBe('issue-created')
  if (r.outcome === 'issue-created') expect(r.url).toBe('https://github.com/o/r/issues/1')
})
