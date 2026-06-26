import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { CLAUDE_MODEL } from '@/lib/ai/model'
import { TOOLS, TOOL_BY_NAME } from '@/lib/mcp/tools'
import { resolveAddToPipeline, resolveBulkStageMove, resolveDraftOutreach, ResolveResult } from '@/lib/hire/agent'
import { searchHelp } from '@/lib/hire/help-content'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── "Ask Levl1" — agentic assistant ────────────────────────────────────────
// Reuses the read-only Build-4 MCP tools (lib/mcp) for answering, and adds an
// ACTION layer: when the user asks to add/move/email, the model calls a
// propose_* tool — the backend resolves the targets and returns a structured
// PROPOSAL (it does NOT execute). The panel renders an approval card; only on
// approval does /api/hire/assistant/execute apply + log the change.

const SYSTEM = `You are Levl1, an agentic assistant embedded in a recruiter's Levl1 Hire ATS.
You do THREE things: (1) ANSWER questions about the recruiter's data (read-only tools), (2) PROPOSE actions (propose_* tools), and (3) GUIDE the user on how to use Levl1 (search_help tool).
Rules:
- Ground every answer in tool results. Never invent candidates, jobs, scores, or product steps.
- Discover ids with list_jobs before acting on a job. Never ask the user for ids — look them up.
- For any side-effecting request (add candidates to a pipeline, move candidates between stages, send/draft outreach), call the matching propose_* tool. NEVER claim you did it — proposing shows the user an approval card; they approve or cancel.
- For HOW-TO / guidance questions ("how do I…", "where do I…", "how does … work"), call search_help and answer ONLY from what it returns: give the concise steps and end by pointing to the screen, e.g. "Go to Team → Client assignments". Do NOT invent steps the help didn't give.
- Read-only data questions: answer directly, concisely, with names + scores. This renders in a narrow chat panel.
- When the user says "this job"/"here" and a current job context is given, use that jobId.`

const HELP_TOOL: Anthropic.Tool = {
  name: 'search_help',
  description: 'Search the Levl1 Hire help guide for how-to / guidance answers (how to use a feature, where to find something). Returns matching help articles with steps and the screen to go to. Use this for any "how do I…", "where do I…", or "how does X work" question.',
  input_schema: { type: 'object', properties: { query: { type: 'string', description: 'The user\'s how-to question or feature keywords.' } }, required: ['query'] },
}

const READONLY_TOOLS: Anthropic.Tool[] = [
  ...TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as Anthropic.Tool.InputSchema })),
  HELP_TOOL,
]

const ACTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'propose_add_candidates_to_pipeline',
    description: 'PROPOSE adding the best-matched candidates to a job\'s pipeline (requires user approval; does NOT execute). Use when the user asks to find/source candidates for a job AND add them. Pass the jobId (from list_jobs) and how many.',
    input_schema: { type: 'object', properties: { jobId: { type: 'string' }, count: { type: 'number', description: 'How many candidates to add (default 5).' } }, required: ['jobId'] },
  },
  {
    name: 'propose_bulk_stage_move',
    description: 'PROPOSE moving candidates whose AI match score meets a threshold to a pipeline stage (requires approval; does NOT execute). Pass minScore (0-100), the destination stage name, and optionally a jobId to restrict.',
    input_schema: { type: 'object', properties: { jobId: { type: 'string' }, minScore: { type: 'number' }, toStage: { type: 'string' } }, required: ['minScore', 'toStage'] },
  },
  {
    name: 'propose_draft_outreach',
    description: 'PROPOSE drafting personalized outreach emails to candidates (requires approval; does NOT send). Pass candidateIds (preferred — get them from search_candidates), or a jobId (+ optional stage) to target recent candidates on that job.',
    input_schema: { type: 'object', properties: { candidateIds: { type: 'array', items: { type: 'string' } }, jobId: { type: 'string' }, stage: { type: 'string' } } },
  },
]
const ACTION_NAMES = new Set(ACTION_TOOLS.map((t) => t.name))
const ALL_TOOLS = [...READONLY_TOOLS, ...ACTION_TOOLS]

async function resolveAction(tenantId: string, name: string, input: Record<string, unknown>): Promise<ResolveResult> {
  if (name === 'propose_add_candidates_to_pipeline') return resolveAddToPipeline(tenantId, String(input.jobId ?? ''), Number(input.count) || 5)
  if (name === 'propose_bulk_stage_move') return resolveBulkStageMove(tenantId, { jobId: input.jobId ? String(input.jobId) : undefined, minScore: Number(input.minScore), toStage: String(input.toStage ?? '') })
  if (name === 'propose_draft_outreach') return resolveDraftOutreach(tenantId, { candidateIds: Array.isArray(input.candidateIds) ? (input.candidateIds as string[]) : undefined, jobId: input.jobId ? String(input.jobId) : undefined, stage: input.stage ? String(input.stage) : undefined })
  return { error: 'Unknown action.' }
}

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

  // Context-awareness — the panel passes the job the user is currently viewing.
  let contextNote = ''
  if (body.context?.jobId) {
    const job = await prisma.hireJob.findFirst({ where: { id: String(body.context.jobId), tenantId: ctx.tenantId }, select: { id: true, title: true } })
    if (job) contextNote = `\n\nCurrent context: the user is viewing the job "${job.title}" (id ${job.id}). If they say "this job" / "here", use that id.`
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const messages: Anthropic.MessageParam[] = [...history]
  if (question) messages.push({ role: 'user', content: question })

  const toolsUsed: string[] = []
  try {
    for (let turn = 0; turn < 6; turn++) {
      const resp = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1200,
        system: SYSTEM + contextNote,
        tools: ALL_TOOLS,
        messages,
      })
      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

      // No tool use → plain answer.
      if (resp.stop_reason !== 'tool_use' || toolUses.length === 0) {
        const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('').trim()
        return NextResponse.json({ answer: text || 'I could not find an answer in your data.', toolsUsed })
      }

      // Action proposal → resolve targets and HALT (await user approval).
      const action = toolUses.find((tu) => ACTION_NAMES.has(tu.name))
      if (action) {
        toolsUsed.push(action.name)
        const leadText = resp.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('').trim()
        const result = await resolveAction(ctx.tenantId, action.name, (action.input ?? {}) as Record<string, unknown>)
        if ('error' in result) return NextResponse.json({ answer: result.error, toolsUsed })
        console.log('[hire/assistant] tenant=%s PROPOSED %s (%d items)', ctx.tenantId, result.proposal.actionType, result.proposal.items.length)
        return NextResponse.json({ answer: leadText || `Here's what I'll do — review and approve:`, proposal: result.proposal, toolsUsed })
      }

      // Otherwise run the read-only tools and continue.
      messages.push({ role: 'assistant', content: resp.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        toolsUsed.push(tu.name)
        try {
          let out: unknown
          if (tu.name === 'search_help') {
            // How-to knowledge source — same content that powers /hire/help.
            const articles = searchHelp(String((tu.input as { query?: string })?.query ?? ''), 5)
            out = articles.map((a) => ({ title: a.title, what: a.what, steps: a.steps, goTo: a.screen.label, href: a.screen.href }))
          } else {
            const tool = TOOL_BY_NAME.get(tu.name)
            out = tool ? await tool.run(ctx.tenantId, (tu.input ?? {}) as Record<string, unknown>) : { error: `Unknown tool ${tu.name}` }
          }
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
