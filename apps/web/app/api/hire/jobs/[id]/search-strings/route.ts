import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODEL } from '@/lib/ai/model'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

interface RubricItem { skill: string; weight: number; required?: boolean; category?: string }
export interface BoardStrings { key: string; label: string; boolean: string; filters: string[] }

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [])

// POST /api/hire/jobs/[id]/search-strings — AI generates per-board sourcing
// search strings for THIS job (Naukri/LinkedIn/Indeed/Monster). Body may carry
// recruiter overrides (skills, experience, location, exclusions, extra keywords).
export const POST = withHireAuth(async (req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const title = String(body.title ?? job.title).trim()
  const mustHave = arr(body.mustHaveSkills).length ? arr(body.mustHaveSkills) : arr(job.mustHaveSkills)
  const niceTo = arr(body.niceToHaveSkills).length ? arr(body.niceToHaveSkills) : arr(job.niceToHaveSkills)
  const exclude = arr(body.exclude)
  const extra = arr(body.extraKeywords)
  const location = String(body.location ?? job.location ?? '').trim()
  const expMin = body.experienceMin != null && body.experienceMin !== '' ? Number(body.experienceMin) : null
  const expMax = body.experienceMax != null && body.experienceMax !== '' ? Number(body.experienceMax) : null

  // Rubric weights — higher-weighted skills should feature more prominently.
  const rubric: RubricItem[] = Array.isArray(job.rubric) ? (job.rubric as unknown as RubricItem[]) : []
  const weighted = rubric.filter((r) => r && r.skill).sort((a, b) => (b.weight || 0) - (a.weight || 0))
  const rubricLine = weighted.length
    ? weighted.map((r) => `${r.skill} (weight ${r.weight}/5${r.required ? ', REQUIRED' : ''})`).join(', ')
    : '(none — weight all must-have skills equally)'

  const expLine = expMin != null || expMax != null
    ? `${expMin ?? 0}${expMax != null ? `-${expMax}` : '+'} years`
    : '(not specified)'

  const prompt = `You are an expert technical sourcer who writes boolean search strings recruiters paste directly into job boards. Generate optimized sourcing strings for ONE role across four Indian/global boards.

ROLE: ${title}
MUST-HAVE SKILLS: ${mustHave.join(', ') || '(infer from title)'}
NICE-TO-HAVE SKILLS: ${niceTo.join(', ') || '(none)'}
RUBRIC WEIGHTS (prioritise higher weights — they should appear earlier / be required terms): ${rubricLine}
EXPERIENCE: ${expLine}
LOCATION: ${location || '(any)'}
EXCLUDE (NOT terms): ${exclude.join(', ') || '(none)'}
EXTRA KEYWORDS TO INCLUDE: ${extra.join(', ') || '(none)'}

Rules:
- Expand skills with realistic SYNONYMS/variants grouped with OR in parentheses (e.g. ("Java" OR "Core Java" OR "J2EE")). Use exact-phrase quotes for multi-word terms.
- Weight matters: highest-weighted/required skills should be ANDed (mandatory); lower-weighted ones can be optional/OR clusters.
- Use each platform's real boolean syntax and capabilities:
  • Naukri: full boolean (AND/OR/NOT, quotes, parentheses); include experience range and current/preferred location as boolean text where useful.
  • LinkedIn: boolean in keyword search (AND/OR/NOT, quotes); keep it tighter (LinkedIn favours concise booleans). Filters are separate.
  • Indeed: boolean keyword query; Indeed supports AND/OR/NOT and quotes.
  • Monster: boolean keyword query.
- For each board ALSO suggest the concrete FILTERS that board offers (e.g. experience range, location, current company, salary, "actively seeking", date posted) as short "Label: value" hints — only filters that platform actually supports.
- Incorporate EXCLUDE terms as NOT/-/clauses appropriately per platform.

Return ONLY valid JSON, no prose, no markdown fences:
{
  "boards": [
    { "key": "naukri",   "label": "Naukri",   "boolean": "<paste-ready boolean string>", "filters": ["Experience: X-Y yrs", "Location: ...", "..."] },
    { "key": "linkedin", "label": "LinkedIn", "boolean": "<paste-ready boolean string>", "filters": ["..."] },
    { "key": "indeed",   "label": "Indeed",   "boolean": "<paste-ready boolean string>", "filters": ["..."] },
    { "key": "monster",  "label": "Monster",  "boolean": "<paste-ready boolean string>", "filters": ["..."] }
  ]
}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1800,
    temperature: 0.3,
    system: 'You generate paste-ready boolean sourcing strings. Output ONLY valid JSON matching the requested schema.',
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = res.content[0]?.type === 'text' ? res.content[0].text : '{}'
  let boards: BoardStrings[] = []
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { boards?: BoardStrings[] }
    boards = Array.isArray(parsed.boards) ? parsed.boards.map((b) => ({ key: b.key, label: b.label, boolean: b.boolean ?? '', filters: arr(b.filters) })) : []
  } catch {
    return NextResponse.json({ error: 'Could not generate search strings — please try again.' }, { status: 502 })
  }
  if (boards.length === 0) return NextResponse.json({ error: 'No search strings produced — try again.' }, { status: 502 })

  // Echo the resolved inputs so the UI can show what was used.
  return NextResponse.json({ boards, inputs: { title, mustHave, niceTo, exclude, extra, location, experienceMin: expMin, experienceMax: expMax } })
})
