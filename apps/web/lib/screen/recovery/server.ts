import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { appUrl } from '@/lib/screen/app-url'
import { releaseBooking } from '@/lib/screen/scheduling/booking'
import { candidateLinks, inferFailureReason, linkKeyOk, recoveryState, canResend, type RecoveryState } from './state'

// ── Interview recovery — server side (Screen-scoped) ───────────────────────
// Resend a link, archive an attempt before a retake, keep reminders pointing at
// the live link, and append the audit trail. Callers do the auth/policy checks.

/** The ?k= link key a candidate arrived with. */
export function keyFromReq(req: Request): string | null {
  try { return new URL(req.url).searchParams.get('k') } catch { return null }
}

/** Append the link key to a candidate URL (no-op for legacy links). */
export function withKey(url: string, inviteKey: string | null | undefined): string {
  if (!inviteKey) return url
  return `${url}${url.includes('?') ? '&' : '?'}k=${encodeURIComponent(inviteKey)}`
}

/** 410 body for a superseded link, or null when the key is fine. */
export function linkKeyError(inviteKey: string | null | undefined, req: Request) {
  return linkKeyOk(inviteKey, keyFromReq(req)) ? null : { error: 'link_replaced' as const }
}

export async function audit(interviewId: string, action: string, actor: string, detail?: Record<string, unknown>) {
  await prisma.interviewAuditEvent.create({ data: { interviewId, action, actor, ...(detail ? { detail: detail as Prisma.InputJsonValue } : {}) } })
    .catch((e) => console.error('[recovery] audit failed', action, e instanceof Error ? e.message : e))
}

const REMINDER_TYPES = ['24hr_reminder', '15min_reminder']

/**
 * Replace this candidate's pending interview reminders. Called on confirm,
 * reschedule, cancel and start-now so an OLD time never triggers a reminder,
 * and every reminder carries the CURRENT (keyed) join link.
 */
export async function replaceReminders(opts: { candidateId: string; agencyId: string; email: string; positionTitle: string; scheduledAt: Date | null; joinUrl: string }) {
  await prisma.scheduledEmail.deleteMany({ where: { candidateId: opts.candidateId, status: 'pending', type: { in: REMINDER_TYPES } } }).catch(() => {})
  if (!opts.scheduledAt) return
  const t = opts.scheduledAt.getTime()
  const rows = [
    { type: '24hr_reminder', at: new Date(t - 24 * 3600_000), subject: `Reminder: Interview tomorrow — ${opts.positionTitle}` },
    { type: '15min_reminder', at: new Date(t - 15 * 60_000), subject: `Your interview starts in 15 minutes — ${opts.positionTitle}` },
  ].filter((r) => r.at.getTime() > Date.now())
  if (!rows.length) return
  await prisma.scheduledEmail.createMany({
    data: rows.map((r) => ({ to: opts.email, subject: r.subject, type: r.type, scheduledAt: r.at, candidateId: opts.candidateId, agencyId: opts.agencyId, metadata: { joinUrl: opts.joinUrl } })),
  }).catch(() => {})
}

const newKey = () => randomBytes(18).toString('base64url')

export type RecoveryError = { ok: false; status: 404 | 409; error: string }

/**
 * Re-issue the candidate's link for the SAME pending interview: a fresh key
 * (older links stop working), a reactivated status if it was cancelled /
 * expired / no-show, rotated token link, and reminders re-pointed. Scheduling
 * and consent are untouched. Sending (email / WhatsApp) is the caller's.
 */
export async function reissueLink(interviewId: string, agencyId: string, actor: string, why: 'resend' | 'retake') {
  const iv = await prisma.interview.findFirst({
    where: { id: interviewId, position: { agencyId } },
    include: { liveState: { select: { lastBeatAt: true } }, token: { select: { id: true } }, candidate: true, position: { include: { agency: true } } },
  })
  if (!iv) return { ok: false, status: 404, error: 'Interview not found' } satisfies RecoveryError
  const state = recoveryState({ status: iv.status, terminationReason: iv.terminationReason, lastBeatAt: iv.liveState?.lastBeatAt, startedAt: iv.startedAt })
  if (why === 'resend' && !canResend(state)) {
    return { ok: false, status: 409, error: state === 'live' ? 'The candidate is in the interview right now.' : state === 'interrupted' || state === 'terminated' ? 'This interview was started but not finished. Use "Approve retake" instead.' : 'This interview has already been taken.' } satisfies RecoveryError
  }
  const inviteKey = newKey()
  const reactivate = state === 'cancelled'
  await prisma.$transaction([
    prisma.interview.update({ where: { id: iv.id }, data: { inviteKey, ...(reactivate ? { status: 'scheduled', scheduledAt: null } : {}) } }),
    ...(reactivate ? [prisma.candidate.update({ where: { id: iv.candidateId }, data: { status: 'invited', scheduledAt: null } })] : []),
    // The token link (/candidate/interview/<token>) is rotated too, so it can't be reused.
    ...(iv.token ? [prisma.interviewToken.update({ where: { interviewId: iv.id }, data: { token: newKey(), usedAt: null, expiresAt: new Date(Date.now() + 7 * 86_400_000) } })] : []),
  ])
  if (reactivate) await releaseBooking(iv.id).catch(() => {})
  const links = candidateLinks(appUrl(), iv.id, inviteKey)
  // Reminders for a still-valid booking now carry the new link.
  const keepAt = !reactivate && iv.scheduledAt && iv.scheduledAt.getTime() > Date.now() ? iv.scheduledAt : null
  await replaceReminders({ candidateId: iv.candidateId, agencyId, email: iv.candidate.email, positionTitle: iv.position.title, scheduledAt: keepAt, joinUrl: links.joinUrl })
  if (why === 'resend') await audit(iv.id, 'link_resent', actor, { reactivated: reactivate, previousState: state })
  return { ok: true as const, interview: iv, links, inviteKey, state, reactivated: reactivate }
}

const json = (v: unknown): Prisma.InputJsonValue | undefined =>
  v == null ? undefined : (JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? Number(x) : x))) as Prisma.InputJsonValue)

/**
 * Archive the current attempt and reset the interview for a clean retake.
 * Nothing is destroyed: transcript, responses, code, work sample, logistics,
 * culture-fit, verification, media and the report are copied into an
 * InterviewAttempt row first; integrity events stay attached (tagged with
 * their attempt number). The live row then holds the new attempt, which is
 * the one scored and used for the hiring decision.
 */
export async function archiveAttempt(interviewId: string, opts: { actor: string; mode: 'admin' | 'recruiter' | 'self'; reason?: string | null; reported?: string | null; keepVerification?: boolean }) {
  const iv = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { workSample: true, logistics: true, cultureFit: true, liveState: true, recording: true, verification: true, candidate: { include: { report: true } } },
  })
  if (!iv) return null
  const state: RecoveryState = recoveryState({ status: iv.status, terminationReason: iv.terminationReason, lastBeatAt: iv.liveState?.lastBeatAt, startedAt: iv.startedAt })
  const status = iv.terminationReason === 'ABANDONED' ? 'abandoned' : state === 'terminated' ? 'terminated' : state === 'completed' ? 'completed' : 'interrupted'
  const live = iv.liveState
  // keepVerification: the candidate already re-verified for the NEW attempt
  // (restart path) — that photo/OTP belongs to the new attempt, leave it.
  const ver = opts.keepVerification ? null : iv.verification
  const snapshot = {
    workSample: iv.workSample,
    logistics: iv.logistics,
    cultureFit: iv.cultureFit,
    liveState: live ? { ...live, transcriptTail: undefined, interim: undefined } : null,
    verification: ver ? { ...ver, photoUrl: undefined, otpCode: undefined } : null,
    report: iv.candidate.report,
    candidate: { status: iv.candidate.status, score: iv.candidate.score, recommendation: iv.candidate.recommendation, interviewedAt: iv.candidate.interviewedAt },
  }
  const failureReason = inferFailureReason(live, opts.reported)

  await prisma.$transaction([
    prisma.interviewAttempt.create({
      data: {
        interviewId: iv.id, attempt: iv.attempt, status,
        startedAt: iv.startedAt, endedAt: iv.completedAt ?? live?.lastBeatAt ?? null,
        terminationReason: iv.terminationReason, failureReason,
        transcript: iv.transcript ?? undefined, questionResponses: iv.questionResponses ?? undefined,
        codeEditorContent: iv.codeEditorContent, runningScore: iv.runningScore,
        snapshot: json(snapshot),
        photoUrl: ver?.photoUrl ?? null,
        ...(iv.recording ? { recordingData: iv.recording.data, recordingMime: iv.recording.mimeType, recordingStartedAt: iv.recording.startedAt, recordingDurationMs: iv.recording.durationMs } : {}),
        mediaPurgedAt: iv.mediaPurgedAt, transcriptPurgedAt: iv.transcriptPurgedAt,
        supersededBy: opts.actor, retakeMode: opts.mode, retakeReason: opts.reason ?? null,
      },
    }),
    // Per-attempt rows are recreated by the retake (all copied above).
    prisma.interviewWorkSample.deleteMany({ where: { interviewId: iv.id } }),
    prisma.interviewLogistics.deleteMany({ where: { interviewId: iv.id } }),
    prisma.cultureFitResult.deleteMany({ where: { interviewId: iv.id } }),
    prisma.interviewLiveState.deleteMany({ where: { interviewId: iv.id } }),
    prisma.interviewRecording.deleteMany({ where: { interviewId: iv.id } }),
    ...(opts.keepVerification ? [] : [prisma.interviewVerification.deleteMany({ where: { interviewId: iv.id } })]),
    prisma.report.deleteMany({ where: { candidateId: iv.candidateId } }),
    prisma.slotBooking.deleteMany({ where: { interviewId: iv.id } }),
    prisma.interview.update({
      where: { id: iv.id },
      data: {
        attempt: { increment: 1 }, status: 'scheduled', scheduledAt: null, startedAt: null, completedAt: null,
        actualDuration: null, candidateJoined: false, agentOnline: false,
        transcript: Prisma.DbNull, questionResponses: Prisma.DbNull, codeEditorContent: null, runningScore: null,
        terminationReason: null, wrapUpAt: null, mediaPurgedAt: null, transcriptPurgedAt: null,
        reportStatus: null, reportError: null, reportAttempts: 0, reportUpdatedAt: null,
      },
    }),
    prisma.candidate.update({ where: { id: iv.candidateId }, data: { status: 'invited', scheduledAt: null, interviewedAt: null, score: null, recommendation: null } }),
  ])
  await audit(iv.id, opts.mode === 'self' ? 'retake_self' : 'retake_approved', opts.actor, { attempt: iv.attempt, nextAttempt: iv.attempt + 1, previousStatus: status, reason: opts.reason ?? null, failureReason })
  return { previousAttempt: iv.attempt, attempt: iv.attempt + 1, status, failureReason }
}
