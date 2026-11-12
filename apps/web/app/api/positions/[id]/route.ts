import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getSessionFromRequest } from '@/lib/auth'
import { PRODUCTION_INTERVIEW_MINUTES, effectiveInterviewMinutes } from '@/lib/screen/session/duration'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeMustHaves } from '@/lib/screen/recruiter/must-haves'
import { sanitizeLogisticsConfig } from '@/lib/screen/logistics/config'
import { readSelection, sanitizeSelectionRequest } from '@/lib/screen/rubrics/types'
import { buildSelection } from '@/lib/screen/rubrics/store'
import { formatExperience, sanitizeConceptRubric, sanitizeExperience, sanitizeKnockouts, sanitizeMix, sanitizeContactEmails } from '@/lib/screen/position-config'
import { isInterviewMode, resolveMode, hasWorkspace } from '@/lib/screen/workspace/modes'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { ensureWorkSampleTask } from '@/lib/screen/workspace/ensure-task'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const position = await prisma.position.findFirst({
      where: { id: params.id, agencyId: session.agencyId },
      include: {
        questionSet: true,
        candidates: true,
        positionReport: true,
        interviews: true,
      },
    })
    if (!position) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ...position, interviewDuration: effectiveInterviewMinutes(position) })
  } catch (err) {
    console.error('GET /api/positions/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch position' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = recruiterAccess(req, { edit: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const owned = await prisma.position.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true, rubricSelection: true } })
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()

    // Whitelist updatable fields to prevent mass-assignment
    const ALLOWED = new Set([
      'status', 'title', 'department', 'workMode', 'interviewDuration',
      'techLeadEmail', 'hrEmail', 'clientManagerEmail',
      'techLeadApproved', 'hrApproved', 'jdApprovedAt', 'jdApprovedBy',
      'l2ScoreThreshold', 'scoringRubric', 'rubricApproved',
      'dynamicIntensity', 'voiceAccent', 'wonCandidateId', 'wonNotes',
      'lostReason', 'lostNotes', 'closedAt', 'mustHaves', 'logistics', 'experienceMin', 'experienceMax', 'questionMix', 'conceptRubric', 'knockoutQuestions',
      'interviewMode', 'workSampleTask', 'rubricSelection',
    ])
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) safe[k] = v
    }
    // Production interview length is platform config (PRODUCTION_INTERVIEW_MINUTES) — never let an update
    // set 20/45/60.
    if ('interviewDuration' in safe) safe.interviewDuration = PRODUCTION_INTERVIEW_MINUTES
    if ('mustHaves' in safe) safe.mustHaves = sanitizeMustHaves(safe.mustHaves)
    if ('logistics' in safe) safe.logistics = sanitizeLogisticsConfig(safe.logistics)
    // Fixpack 3 — validated shapes (lib/screen/position-config.ts)
    if ('experienceMin' in safe || 'experienceMax' in safe) {
      const exp = sanitizeExperience(safe.experienceMin, safe.experienceMax)
      if (!exp) return NextResponse.json({ error: 'Experience range is invalid — min must be 0–40 and not more than max.' }, { status: 400 })
      safe.experienceMin = exp.min; safe.experienceMax = exp.max
      safe.experienceLevel = formatExperience(exp)
    }
    // Fixpack 7 #1 — per-job approver emails: validated + normalised.
    const contactErr = sanitizeContactEmails(safe)
    if ('rubricSelection' in safe) {
      const sel = await buildSelection(access.session.agencyId, sanitizeSelectionRequest(safe.rubricSelection), readSelection(owned.rubricSelection))
      if (!sel.ok) return NextResponse.json({ error: sel.error }, { status: 400 })
      safe.rubricSelection = sel.selection
    }
    if (contactErr) return NextResponse.json({ error: contactErr }, { status: 400 })
    if ('questionMix' in safe) safe.questionMix = sanitizeMix(safe.questionMix)
    if ('conceptRubric' in safe) safe.conceptRubric = sanitizeConceptRubric(safe.conceptRubric)
    if ('knockoutQuestions' in safe) safe.knockoutQuestions = sanitizeKnockouts(safe.knockoutQuestions)
    if ('interviewMode' in safe) safe.interviewMode = isInterviewMode(safe.interviewMode) ? safe.interviewMode : null
    if ('workSampleTask' in safe) {
      if (safe.workSampleTask === null) safe.workSampleTask = Prisma.DbNull
      else {
        const t = sanitizeTask(safe.workSampleTask)
        if (!t) return NextResponse.json({ error: 'Work-sample task needs a title, a prompt and at least one test.' }, { status: 400 })
        safe.workSampleTask = t as unknown as Prisma.InputJsonValue
      }
    }

    const position = await prisma.position.update({
      where: { id: params.id },
      data:  safe,
    })
    // Switched to technical / hybrid with no task yet → draft one in the background.
    if ('interviewMode' in safe && hasWorkspace(resolveMode(position)) && !position.workSampleTask) void ensureWorkSampleTask(position.id)
    return NextResponse.json(position)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[positions] Failed:', message)
    console.error('[positions] Full error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
