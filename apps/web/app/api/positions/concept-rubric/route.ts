import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { SCORING_MODEL } from '@/lib/screen/interview/model'
import { RUBRIC_MAX, formatExperience, parseExperience, sanitizeConceptRubric, sanitizeExperience } from '@/lib/screen/position-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── JD-based concept rubric (Screen #13) ───────────────────────────────────
// POST { jdText, positionTitle, experienceMin?, experienceMax?, experienceLevel?,
//        skills?, mustHaves? } → { rubric: [{ id, concept, strong, weak }] }
// The key concepts/competencies the role needs, each with what a strong vs weak
// answer looks like. Recruiter reviews/edits it; it then steers question
// generation and grounds the report's per-concept scoring. Generation only —
// nothing is saved here (the position create/PATCH persists the edited rubric).

export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const jdText = typeof body.jdText === 'string' ? body.jdText.trim().slice(0, 8000) : ''
  const title = typeof body.positionTitle === 'string' ? body.positionTitle.slice(0, 120) : ''
  if (jdText.length < 50 && !title) return NextResponse.json({ error: 'Add a job description first' }, { status: 400 })
  const exp = sanitizeExperience(body.experienceMin, body.experienceMax) ?? parseExperience(body.experienceLevel)
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20).join(', ') : '')

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const r = await client.messages.create({
      model: SCORING_MODEL,
      max_tokens: 1800,
      system:
        'You are a senior hiring manager building an interview rubric. From the job description and hiring details, identify the ' +
        `${Math.min(6, RUBRIC_MAX)} (at most ${RUBRIC_MAX}) concepts/competencies that most determine success in THIS role — specific to the role, not generic ` +
        '("Kafka consumer-group rebalancing", "SQL query tuning", "stakeholder negotiation with auditors" — not "communication" or "teamwork" unless the role truly hinges on it). ' +
        'For each, describe concretely what a STRONG answer demonstrates and what a WEAK answer looks like (observable, one sentence each). ' +
        'Calibrate to the experience level. Return ONLY JSON: {"rubric":[{"concept":"...","strong":"...","weak":"..."}]}',
      messages: [{
        role: 'user',
        content:
          `Role: ${title || 'Not specified'}\n` +
          `Experience: ${exp ? formatExperience(exp) : 'Not specified'}\n` +
          (list(body.skills) ? `Required skills: ${list(body.skills)}\n` : '') +
          (list(body.mustHaves) ? `Must-haves: ${list(body.mustHaves)}\n` : '') +
          `\nJob description:\n${jdText || '(none provided)'}`,
      }],
    })
    const text = r.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const json = text.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)?.[0]
    const rubric = sanitizeConceptRubric(json ? (JSON.parse(json) as { rubric?: unknown }).rubric : [])
    if (!rubric.length) return NextResponse.json({ error: 'Could not build a rubric from this JD — try again or add concepts manually' }, { status: 502 })
    return NextResponse.json({ rubric })
  } catch (e) {
    console.error('[positions/concept-rubric]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Rubric generation failed — try again' }, { status: 500 })
  }
}
