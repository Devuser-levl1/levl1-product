import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { appUrl } from '@/lib/screen/app-url'
import { openArray, revealEvents } from '@/lib/screen/privacy/fields'
import { summarizeIntegrity } from '@/lib/screen/integrity/summary'
import { STATE_LABEL, candidateLinks, canResend, canRetake, maxReschedules, recoveryState, retakePolicy } from '@/lib/screen/recovery/state'

export const dynamic = 'force-dynamic'

// GET — recovery view of one interview for the recruiter: its state, what can
// be done (resend / retake), the current candidate link, every earlier attempt
// (status, failure reason, who authorised the retake, its integrity summary)
// and the audit trail. ?attempt=N adds that attempt's transcript + events.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const iv = await prisma.interview.findFirst({
    where: { id: params.id, position: { agencyId: access.session.agencyId }, isDemo: false },
    select: {
      id: true, status: true, terminationReason: true, startedAt: true, completedAt: true, scheduledAt: true, attempt: true, inviteKey: true, rescheduleCount: true,
      liveState: { select: { lastBeatAt: true } },
      attempts: { orderBy: { attempt: 'asc' }, select: { attempt: true, status: true, startedAt: true, endedAt: true, terminationReason: true, failureReason: true, supersededAt: true, supersededBy: true, retakeMode: true, retakeReason: true, snapshot: true, transcriptPurgedAt: true } },
      auditEvents: { orderBy: { createdAt: 'desc' }, take: 50, select: { action: true, actor: true, detail: true, createdAt: true } },
    },
  })
  if (!iv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const state = recoveryState({ status: iv.status, terminationReason: iv.terminationReason, lastBeatAt: iv.liveState?.lastBeatAt, startedAt: iv.startedAt })
  const policy = retakePolicy()
  const mayApprove = policy === 'admin' ? access.isAdmin : access.canEdit

  // Integrity per attempt (events are tagged with their attempt number).
  const events = await prisma.interviewIntegrityEvent.findMany({ where: { interviewId: iv.id }, orderBy: { occurredAt: 'asc' } })
  const byAttempt = new Map<number, typeof events>()
  for (const e of events) byAttempt.set(e.attempt, [...(byAttempt.get(e.attempt) ?? []), e])
  const integrityOf = (n: number) => {
    const s = summarizeIntegrity(revealEvents(byAttempt.get(n) ?? []))
    return { totalEvents: s.totalEvents, totalFlags: s.totalFlags, reviewStatus: s.reviewStatus }
  }

  const want = Number(new URL(req.url).searchParams.get('attempt'))
  const detail = Number.isInteger(want) && want > 0 ? await (async () => {
    const a = await prisma.interviewAttempt.findUnique({ where: { interviewId_attempt: { interviewId: iv.id, attempt: want } }, select: { transcript: true, questionResponses: true, transcriptPurgedAt: true } })
    if (!a) return null
    return { attempt: want, transcript: openArray(a.transcript), questionResponses: openArray(a.questionResponses), transcriptPurged: !!a.transcriptPurgedAt, integrity: summarizeIntegrity(revealEvents(byAttempt.get(want) ?? [])) }
  })() : null

  return NextResponse.json({
    interviewId: iv.id,
    state, stateLabel: STATE_LABEL[state],
    attempt: iv.attempt,
    scheduledAt: iv.scheduledAt, startedAt: iv.startedAt, completedAt: iv.completedAt,
    policy, canResend: access.canEdit && canResend(state), canRetake: canRetake(state), canApproveRetake: mayApprove && canRetake(state),
    retakeApprover: policy === 'admin' ? 'workspace admins' : 'recruiters',
    links: candidateLinks(appUrl(), iv.id, iv.inviteKey),
    reschedules: { used: iv.rescheduleCount, max: maxReschedules() },
    currentIntegrity: integrityOf(iv.attempt),
    attempts: iv.attempts.map((a) => {
      const snap = (a.snapshot ?? {}) as { report?: { overallScore?: number; recommendation?: string } | null }
      return {
        attempt: a.attempt, status: a.status, startedAt: a.startedAt, endedAt: a.endedAt, terminationReason: a.terminationReason,
        failureReason: a.failureReason, supersededAt: a.supersededAt, supersededBy: a.supersededBy, retakeMode: a.retakeMode, retakeReason: a.retakeReason,
        report: snap.report ? { overallScore: snap.report.overallScore ?? null, recommendation: snap.report.recommendation ?? null } : null,
        integrity: integrityOf(a.attempt), transcriptPurged: !!a.transcriptPurgedAt,
      }
    }),
    audit: iv.auditEvents,
    detail,
  })
}
