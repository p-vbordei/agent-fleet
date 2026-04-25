import type { FleetEntry } from './config'
import { renderTickPrompt } from './prompts'
import { isAllowedCommand } from './sandbox'

export type ExecResult = { stdout: string; stderr: string; code: number }
export type ExecFn = (cmd: string) => ExecResult

export interface TickDeps {
  anthropic: { messages: { create: (params: unknown) => Promise<unknown> } }
  exec: ExecFn
  now: () => Date
}

export type TickOutcome =
  | { outcome: 'no-findings' }
  | { outcome: 'issue-created'; url: string }
  | { outcome: 'error'; message: string }

const MAX_TURNS = 10

const TOOLS = [
  {
    name: 'bash',
    description: 'Run a shell command. Restricted to invocations of `gh`.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
]

interface AnthropicResponse {
  content: AnthropicBlock[]
  stop_reason: string
}

type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: { command?: string } }

interface ToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error: boolean
}

export async function tickOne(entry: FleetEntry, deps: TickDeps): Promise<TickOutcome> {
  const isoDate = deps.now().toISOString().slice(0, 10)
  const prompt = renderTickPrompt({ repo: entry.repo, isoDate })
  const messages: unknown[] = [{ role: 'user', content: prompt }]
  let issueUrl: string | undefined

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = (await deps.anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      tools: TOOLS,
      messages,
    })) as AnthropicResponse

    messages.push({ role: 'assistant', content: resp.content })

    const toolUses = resp.content.filter(
      (b): b is Extract<AnthropicBlock, { type: 'tool_use' }> => b.type === 'tool_use',
    )
    const textBlocks = resp.content.filter(
      (b): b is Extract<AnthropicBlock, { type: 'text' }> => b.type === 'text',
    )

    if (toolUses.length === 0) {
      if (issueUrl) return { outcome: 'issue-created', url: issueUrl }
      const text = textBlocks
        .map((b) => b.text)
        .join(' ')
        .trim()
      if (text.includes('no-findings')) return { outcome: 'no-findings' }
      return { outcome: 'no-findings' }
    }

    const toolResults: ToolResult[] = []
    for (const tu of toolUses) {
      if (tu.name !== 'bash') {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'unknown tool',
          is_error: true,
        })
        continue
      }
      const cmd = String(tu.input?.command ?? '')
      const allow = isAllowedCommand(cmd)
      if (!allow.allowed) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: `error: ${allow.reason}`,
          is_error: true,
        })
        continue
      }
      // C3 interlock: at most one issue created per tick run.
      if (cmd.startsWith('gh issue create')) {
        if (issueUrl) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: 'error: only one issue allowed per tick run',
            is_error: true,
          })
          continue
        }
        const r = deps.exec(cmd)
        const m = r.stdout.match(/https:\/\/github\.com\/[^\s]+/)
        if (m) issueUrl = m[0]
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: r.stdout || r.stderr || '',
          is_error: r.code !== 0,
        })
        continue
      }
      const r = deps.exec(cmd)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: r.stdout || r.stderr || '',
        is_error: r.code !== 0,
      })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  return { outcome: 'error', message: `exceeded ${MAX_TURNS} turns` }
}
