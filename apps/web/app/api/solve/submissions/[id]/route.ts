import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { openArray, openText } from '@/lib/screen/privacy/fields'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { sanitizeSolveConfig } from '@/lib/screen/solve/config'
import { runSolveReport } from '@/lib/screen/solve/report'
import { applyTimeTransitions } from '@/lib/screen/solve/session'
import type { DefenseTurn } from '@/lib/screen/solve/defense'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Recruiter view of one Solve submission (agency-scoped):
// GET  → report + the evidence behind it (code, tests, defense transcript, timeline moments)
// POST { action: 'retry_report' } → regenerate now (edit access)

async function load(id: string, agencyId: string) {
  return prisma.solveSubmission.findFirst({
    where: { id, agencyId },
    select: {
      id: true, status: true, task: true, config: true, language: true, code: true, invitedAt: true, expiresAt: true, startedAt: true, deadlineAt: true, submittedAt: true,
      autoSubmitted: true, finalTests: true, submissionQuality: true, consentGiven: true, consentAt: true, consentNoticeVersion: true,
      defenseStatus: true, defenseDeadlineAt: true, defenseStartedAt: true, defenseCompletedAt: true, defenseTranscript: true, defenseInputMode: true,
      report: true, score: true, recommendation: true, reportStatus: true, reportError: true, reportAttempts: true, purgedAt: true,
      candidate: { select: { id: true, name: true, email: true, score: true, recommendation: true, interview: { select: { status: true } } } },
      position: { select: { id: true, title: true, company: true } },
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  let s = await load(params.id, access.session.agencyId)
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await applyTimeTransitions(s)
  s = (await load(params.id, access.session.agencyId))!
  const task = sanitizeTask(s.task)
  return NextResponse.json({
    id: s.id, status: s.status, canEdit: access.canEdit,
    candidate: { id: s.candidate.id, name: s.candidate.name, email: s.candidate.email, screen: s.candidate.interview?.status === 'completed' ? { score: s.candidate.score, recommendation: s.candidate.recommendation } : null },
    position: s.position,
    task: task ? { title: task.title, prompt: task.prompt, tests: task.tests.map(({ id, name, hidden }) => ({ id, name, hidden })), lookFor: task.lookFor, probeAngles: task.probeAngles } : null,
    config: sanitizeSolveConfig(s.config),
    timing: { invitedAt: s.invitedAt, expiresAt: s.expiresAt, startedAt: s.startedAt, deadlineAt: s.deadlineAt, submittedAt: s.submittedAt, autoSubmitted: s.autoSubmitted },
    consent: { given: s.consentGiven, at: s.consentAt, noticeVersion: s.consentNoticeVersion },
    work: { language: s.language, code: s.purgedAt ? null : openText(s.code), finalTests: s.finalTests ?? null, quality: s.submissionQuality, purgedAt: s.purgedAt },
    defense: {
      status: s.defenseStatus, deadlineAt: s.defenseDeadlineAt, startedAt: s.defenseStartedAt, completedAt: s.defenseCompletedAt, inputMode: s.defenseInputMode,
      turns: openArray<DefenseTurn>(s.defenseTranscript).map(({ speaker, text, mode }) => ({ speaker, text, mode: mode ?? null })),
    },
    report: s.report ?? null, score: s.score, recommendation: s.recommendation,
    reportStatus: s.reportStatus, reportError: s.reportStatus === 'failed' ? s.reportError : null, reportAttempts: s.reportAttempts,
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const s = await prisma.solveSubmission.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true, status: true, defenseStatus: true } })
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as { action?: unknown }
  if (body.action !== 'retry_report') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  if (!['submitted', 'completed'].includes(s.status) || ['pending', 'in_progress'].includes(s.defenseStatus)) return NextResponse.json({ error: 'The take-home isn\'t ready to evaluate yet.' }, { status: 409 })
  const ok = await runSolveReport(s.id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'The report couldn\'t be generated. Try again in a few minutes.' }, { status: 502 })
}
