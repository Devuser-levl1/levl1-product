import { prisma } from '@/lib/prisma'
import { TERMINATION_REASONS } from '@/lib/screen/session/lifecycle'
import { openArray } from '@/lib/screen/privacy/fields'

// ── Report pipeline guard (Fixpack 6 #3) — Screen-scoped ───────────────────
// A completed interview must reliably produce a report, or be visibly flagged.
//  • markReport()        — persists Interview.reportStatus (generating | ready | failed)
//  • serverReportInput() — rebuilds the generate-report input from the DB
//                          (heartbeat-persisted transcript + responses), so a
//                          report never depends on the candidate's tab staying open
//  • findPendingReports()— completed (or abandoned) interviews with no report yet

export type ReportStatus = 'generating' | 'ready' | 'failed'

/** After this many failed attempts the sweep stops retrying; the recruiter can still retry manually. */
export const MAX_AUTO_ATTEMPTS = 3
/** Don't race the live client: the room starts its own generation right after the closing line. */
const SETTLE_MS = 3 * 60_000
/** A 'generating' row older than this is treated as dead (process restarted mid-call). */
const STUCK_MS = 10 * 60_000
/** An in_progress interview with no heartbeat for this long was abandoned (tab closed, etc). */
const ABANDON_MS = 20 * 60_000

export async function markReport(interviewId: string, status: ReportStatus, error?: string | null, countAttempt = false) {
  try {
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        reportStatus: status,
        reportError: status === 'failed' ? (error ?? 'Unknown error').slice(0, 1000) : null,
        reportUpdatedAt: new Date(),
        ...(countAttempt ? { reportAttempts: { increment: 1 } } : {}),
      },
    })
  } catch (e) {
    // Unknown id (e.g. a manual regenerate keyed by candidate id) — status is best-effort.
    console.warn('[report-pipeline] markReport skipped:', e instanceof Error ? e.message : e)
  }
}

interface StoredEntry { speaker?: string; text?: string; segment?: string }

/**
 * Rebuild the generate-report request body from what the server already holds.
 * Logistics turns are excluded (recruiter-only, never scored) — same rule as the room.
 */
export async function serverReportInput(interviewId: string) {
  const iv = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true, candidateId: true, transcript: true, questionResponses: true, completedAt: true, duration: true,
      candidate: { select: { name: true, email: true } },
      position: { select: { id: true, title: true, company: true, techStack: true, experienceLevel: true, interviewDuration: true } },
    },
  })
  if (!iv) return null
  const transcript = openArray<StoredEntry>(iv.transcript)  // decrypted; legacy plaintext accepted
    .filter((e) => e && (e.speaker === 'ai' || e.speaker === 'candidate') && typeof e.text === 'string' && e.segment !== 'logistics')
    .map((e) => ({ speaker: e.speaker as string, text: e.text as string }))
  const questionResponses = openArray(iv.questionResponses)
  const candidateSpoke = transcript.some((e) => e.speaker === 'candidate' && e.text.trim().length > 0)
  return {
    interviewId: iv.id,
    candidateId: iv.candidateId,
    positionId: iv.position.id,
    candidateName: iv.candidate.name,
    candidateEmail: iv.candidate.email ?? '',
    positionTitle: iv.position.title,
    company: iv.position.company,
    interviewDate: (iv.completedAt ?? new Date()).toISOString().slice(0, 10),
    duration: iv.position.interviewDuration ?? iv.duration,
    transcript,
    questionResponses,
    resumeText: '',
    techStack: iv.position.techStack ?? [],
    experienceLevel: iv.position.experienceLevel ?? '',
    roleType: '',
    sttFailed: !candidateSpoke && questionResponses.length === 0,
    serverSourced: true,
  }
}

/**
 * Interviews that should have a report but don't. Also closes out abandoned
 * sessions (no heartbeat for ABANDON_MS) as ABANDONED so they get one too.
 * Consent-withdrawn sessions are never scored. Demo runs are excluded.
 */
export async function findPendingReports(opts: { agencyId?: string; limit?: number } = {}): Promise<string[]> {
  const now = Date.now()
  const scope = opts.agencyId ? { position: { agencyId: opts.agencyId } } : {}

  // 1. Abandoned live sessions → completed/ABANDONED (the transcript is already persisted by the heartbeat).
  const stale = await prisma.interview.findMany({
    where: {
      ...scope, isDemo: false, status: 'in_progress',
      liveState: { lastBeatAt: { lt: new Date(now - ABANDON_MS) } },
    },
    select: { id: true, liveState: { select: { lastBeatAt: true } } },
    take: 50,
  })
  for (const s of stale) {
    await prisma.interview.update({
      where: { id: s.id },
      data: { status: 'completed', completedAt: s.liveState?.lastBeatAt ?? new Date(), terminationReason: TERMINATION_REASONS.ABANDONED },
    }).catch(() => {})
    await prisma.candidate.updateMany({ where: { interview: { id: s.id } }, data: { status: 'completed' } }).catch(() => {})
  }

  // 2. Completed, not consent-withdrawn, no Report row, not exhausted, not mid-flight.
  const rows = await prisma.interview.findMany({
    where: {
      ...scope, isDemo: false, status: 'completed',
      completedAt: { lt: new Date(now - SETTLE_MS) },
      OR: [{ terminationReason: null }, { terminationReason: { not: TERMINATION_REASONS.CONSENT_WITHDRAWN } }],
      candidate: { report: null },
      reportAttempts: { lt: MAX_AUTO_ATTEMPTS },
    },
    select: { id: true, reportStatus: true, reportUpdatedAt: true },
    orderBy: { completedAt: 'asc' },
    take: opts.limit ?? 5,
  })
  return rows
    .filter((r) => r.reportStatus !== 'generating' || !r.reportUpdatedAt || now - r.reportUpdatedAt.getTime() > STUCK_MS)
    .map((r) => r.id)
}
