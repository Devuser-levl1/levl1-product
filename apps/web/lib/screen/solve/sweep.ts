import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { readCapturePolicy } from '@/lib/screen/privacy/policy'
import { applyTimeTransitions } from './session'
import { findPendingSolveReports, runSolveReport } from './report'

// ── Solve sweep (Screen-scoped, server-only) ───────────────────────────────
// Run by the existing report-sweep cron (and on recruiter page loads):
//   1. time transitions nobody triggered (expired invites, deadline
//      auto-submits, missed / abandoned defenses)
//   2. missing / failed reports (sequential; capped attempts)
//   3. retention: code, work timeline and defense transcript are deleted
//      SCREEN_TRANSCRIPT_RETENTION_DAYS after submission (same window as an
//      interview transcript — the candidate notice states this). The report stays.

let running = false

export async function runSolveSweep(opts: { agencyId?: string; limit?: number } = {}) {
  if (running) return { skipped: true, transitions: 0, reports: [] as string[], purged: 0 }
  running = true
  try {
    const now = new Date()
    const due = await prisma.solveSubmission.findMany({
      where: {
        ...(opts.agencyId ? { agencyId: opts.agencyId } : {}),
        OR: [
          { status: 'invited', expiresAt: { lt: now } },
          { status: 'started', deadlineAt: { lt: now } },
          { defenseStatus: 'pending', defenseDeadlineAt: { lt: now } },
          { defenseStatus: 'in_progress', defenseStartedAt: { lt: new Date(now.getTime() - 45 * 60_000) } },
        ],
      },
      select: { id: true, status: true, expiresAt: true, deadlineAt: true, defenseStatus: true, defenseDeadlineAt: true, defenseStartedAt: true },
      take: 25,
    })
    for (const s of due) await applyTimeTransitions(s).catch((e) => console.error('[solve-sweep] transition failed', s.id, e instanceof Error ? e.message : e))

    const ids = await findPendingSolveReports({ agencyId: opts.agencyId, limit: opts.limit ?? 5 })
    for (const id of ids) await runSolveReport(id)

    const cutoff = new Date(now.getTime() - readCapturePolicy().transcriptRetentionDays * 86_400_000)
    const purged = await prisma.solveSubmission.updateMany({
      where: { purgedAt: null, submittedAt: { lt: cutoff } },
      data: { code: null, timeline: Prisma.DbNull, defenseTranscript: Prisma.DbNull, purgedAt: now },
    })
    return { skipped: false, transitions: due.length, reports: ids, purged: purged.count }
  } finally {
    running = false
  }
}
