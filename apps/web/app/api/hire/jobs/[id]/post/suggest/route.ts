import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getConnector } from '@/lib/hire/boards'
import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/hire/jobs/[id]/post/suggest — AI-suggest a board's required extra
// fields (e.g. Naukri industry / role category) from the job, so the recruiter
// confirms a default instead of re-entering. Body: { provider }.
export const POST = withHireAuth(async (req, ctx, params) => {
  const { provider } = await req.json().catch(() => ({}))
  const connector = getConnector(provider)
  const fields = connector?.postingExtraFields ?? []
  if (fields.length === 0) return NextResponse.json({ suggestions: {} })

  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { title: true, description: true, mustHaveSkills: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const suggestions: Record<string, string> = {}
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ suggestions })
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const keys = fields.map((f) => `"${f.key}": <best single ${f.label} value>`).join(', ')
    const res = await client.messages.create({
      model: CLAUDE_MODEL, max_tokens: 150, temperature: 0,
      system: 'You map a job to standard job-board taxonomy values. Return ONLY JSON with the requested keys, each a concise standard value.',
      messages: [{ role: 'user', content: `Return ONLY JSON: { ${keys} }\n\nJob title: ${job.title}\nSkills: ${(job.mustHaveSkills ?? []).join(', ')}\nDescription: ${(job.description ?? '').slice(0, 1500)}` }],
    })
    const raw = res.content[0]?.type === 'text' ? res.content[0].text : '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Record<string, unknown>
    for (const f of fields) if (typeof parsed[f.key] === 'string') suggestions[f.key] = parsed[f.key] as string
  } catch (e) {
    console.error('[hire/post/suggest] failed:', e instanceof Error ? e.message : e)
  }
  return NextResponse.json({ suggestions })
})
