import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { PRODUCTION_INTERVIEW_MINUTES, effectiveInterviewMinutes } from '@/lib/screen/session/duration'
import { sanitizeMustHaves } from '@/lib/screen/recruiter/must-haves'
import { sanitizeLogisticsConfig } from '@/lib/screen/logistics/config'
import { formatExperience, sanitizeConceptRubric, sanitizeExperience, sanitizeKnockouts, sanitizeMix, sanitizeContactEmails } from '@/lib/screen/position-config'
import { isInterviewMode, resolveMode, hasWorkspace } from '@/lib/screen/workspace/modes'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { ensureWorkSampleTask } from '@/lib/screen/workspace/ensure-task'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Agency-scoped and session-required: positions carry recruiter-only data
    // (logistics comp band). Unauthenticated callers used to get every agency's.
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const positions = await prisma.position.findMany({
      where: { agencyId: session.agencyId },
      include: {
        questionSet: true,
        candidates: { select: { id: true, status: true, score: true } },
        _count: { select: { interviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(positions.map((p) => ({ ...p, interviewDuration: effectiveInterviewMinutes(p) })))
  } catch (err) {
    console.error('GET /api/positions error:', err)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Session required; the agency ALWAYS comes from the session. The old
    // `?? body.agencyId` fallback created positions owned by no agency when the
    // session was missing — invisible to every scoped read ("Position not found").
    const session  = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const body     = await req.json()
    const agencyId = session.agencyId

    // Duplicate detection — same title + company for this agency, not closed/lost/won
    if (agencyId && body.title && body.company) {
      const existing = await prisma.position.findFirst({
        where: {
          agencyId,
          title:   { equals: body.title,   mode: 'insensitive' },
          company: { equals: body.company, mode: 'insensitive' },
          status:  { notIn: ['closed', 'lost', 'won'] },
        },
      })
      if (existing) {
        // Find-or-create: REUSE the existing position (200) instead of 409. The
        // caller's intent is "ensure this position exists so I can attach a
        // candidate" — blindly 409-ing left it with no valid positionId, which
        // is exactly what caused the downstream Candidate FK violation.
        // Opt-in 409 only when a UI explicitly wants the duplicate warning.
        if (body.failOnDuplicate === true) {
          return NextResponse.json(
            { error: 'duplicate', message: `A position for "${body.title}" at "${body.company}" already exists.`, existingId: existing.id, position: existing },
            { status: 409 },
          )
        }
        return NextResponse.json({ ...existing, _deduped: true }, { status: 200 })
      }
    }

    // Whitelist scalar columns so a stray field in the request body can't
    // crash the create with an unknown-argument Prisma error.
    const ALLOWED = new Set([
      'title', 'company', 'department', 'roleType', 'experienceLevel',
      'primaryDomain', 'techStack', 'goodToHave', 'domainContext', 'companyStage',
      'workMode', 'interviewDuration', 'status', 'jdText', 'jdSource',
      'jdApprovedBy', 'jdApprovedAt', 'techLeadApproved', 'hrApproved',
      'techLeadEmail', 'hrEmail', 'clientManagerEmail', 'l2ScoreThreshold',
      'rubricApproved', 'scoringRubric', 'dynamicIntensity', 'voiceAccent',
      'softSkillWeightage', 'clientId', 'mustHaves', 'logistics', 'experienceMin', 'experienceMax', 'questionMix', 'conceptRubric', 'knockoutQuestions',
      'interviewMode', 'workSampleTask',
    ])
    const data: Record<string, unknown> = { agencyId }
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) data[k] = v
    }
    // Production interview length is platform config (PRODUCTION_INTERVIEW_MINUTES) — ignore any client
    // value (20/45/60 are gone). Demo durations use a separate route and are
    // unaffected.
    data.interviewDuration = PRODUCTION_INTERVIEW_MINUTES
    if ('mustHaves' in data) data.mustHaves = sanitizeMustHaves(data.mustHaves)
    if ('logistics' in data) data.logistics = sanitizeLogisticsConfig(data.logistics)
    // Fixpack 3 — validated shapes (lib/screen/position-config.ts)
    if ('experienceMin' in data || 'experienceMax' in data) {
      const exp = sanitizeExperience(data.experienceMin, data.experienceMax)
      if (!exp) return NextResponse.json({ error: 'Experience range is invalid — min must be 0–40 and not more than max.' }, { status: 400 })
      data.experienceMin = exp.min; data.experienceMax = exp.max
      data.experienceLevel = formatExperience(exp)
    }
    // Fixpack 7 #1 — per-job approver emails: validated + normalised.
    const contactErr = sanitizeContactEmails(data)
    if (contactErr) return NextResponse.json({ error: contactErr }, { status: 400 })
    if ('questionMix' in data) data.questionMix = sanitizeMix(data.questionMix)
    if ('conceptRubric' in data) data.conceptRubric = sanitizeConceptRubric(data.conceptRubric)
    if ('knockoutQuestions' in data) data.knockoutQuestions = sanitizeKnockouts(data.knockoutQuestions)
    // Observe & Defend: explicit mode (or null = JD-suggested) + optional task.
    if ('interviewMode' in data) data.interviewMode = isInterviewMode(data.interviewMode) ? data.interviewMode : null
    if ('workSampleTask' in data) data.workSampleTask = sanitizeTask(data.workSampleTask) ?? undefined

    const position = await prisma.position.create({ data: data as never })
    // Technical / hybrid → draft (and Judge0-verify) a work-sample task in the background.
    if (hasWorkspace(resolveMode(position)) && !position.workSampleTask) void ensureWorkSampleTask(position.id)
    return NextResponse.json(position, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[positions] Failed:', message)
    console.error('[positions] Full error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
