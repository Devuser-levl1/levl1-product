import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { TOOLS, TOOL_BY_NAME } from '@/lib/mcp/tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── "Ask Levl1" — chat with your Hire data (P0-6) ──────────────────────────
// A session-authenticated, in-app entry point to the SAME read-only data layer
// that powers the Build-4 MCP server (lib/mcp/tools.ts → lib/mcp/queries.ts).
// We don't rebuild the data access — we run a Claude tool-use loop over those
// exact tools, scoped to the recruiter's tenant from their JWT.

const SYSTEM = `You are Levl1, an assistant embedded in a recruiter's Levl1 Hire ATS.
Answer questions about THIS recruiter's own hiring data — jobs, candidates, pipeline stages, AI match/resume scores, and interviews — by calling the provided read-only tools. Rules:
- Always ground answers in tool results. Never invent candidates, jobs, or numbers.
- Discover ids with list_jobs before filtering by job. Use search_candidates / pipeline_summary / recent_activity as needed.
- Be concise and decision-oriented: short sentences, small bullet lists, surface names + scores. This renders in a compact chat panel.
- If the data shows nothing, say so plainly (e.g. "No candidates are in Screening for that role yet.").
- Never ask the user for ids — look them up yourself.`

const anthropicTools: Anthropic.Tool[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
}))

export const POST = withHireAuth(async (req, ctx) => {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })
  const body = await req.json().catch(() => ({}))
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const history: Anthropic.MessageParam[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m: { role?: string; content?: unknown }) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-8)
        .map((m: { role: 'user' | 'assistant'; content: string }) => ({ role: m.role, content: m.content }))
    : []
  if (!question && history.length === 0) return NextResponse.json({ error: 'Ask a question' }, { status: 400 })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const messages: Anthropic.MessageParam[] = [...history]
  if (question) messages.push({ role: 'user', content: question })

  const toolsUsed: string[] = []
  try {
    // Tool-use loop — bounded so a misbehaving model can't run forever.
    for (let turn = 0; turn < 6; turn++) {
      const resp = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        system: SYSTEM,
        tools: anthropicTools,
        messages,
      })
      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
        const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('').trim()
        console.log('[hire/assistant] tenant=%s tools=%s answered=%d chars', ctx.tenantId, toolsUsed.join(',') || 'none', text.length)
        return NextResponse.json({ answer: text || 'I could not find an answer in your data.', toolsUsed })
      }

      messages.push({ role: 'assistant', content: resp.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const tool = TOOL_BY_NAME.get(tu.name)
        toolsUsed.push(tu.name)
        try {
          const out = tool ? await tool.run(ctx.tenantId, (tu.input ?? {}) as Record<string, unknown>) : { error: `Unknown tool ${tu.name}` }
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out).slice(0, 12000) })
        } catch (e) {
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: `Error: ${e instanceof Error ? e.message : 'failed'}`, is_error: true })
        }
      }
      messages.push({ role: 'user', content: results })
    }
    return NextResponse.json({ answer: 'That needed more steps than I can take in one go — try narrowing the question.', toolsUsed })
  } catch (e) {
    console.error('[hire/assistant] failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Assistant failed — please try again.' }, { status: 500 })
  }
})
