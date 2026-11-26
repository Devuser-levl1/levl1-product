import { prisma } from '@/lib/prisma'
import { runReportSweep } from './sweep'

// ── Interview completion → report + candidate stage (Screen-scoped) ─────────
// Real-user bug (2026-11-26): a completed interview produced no report until a
// recruiter happened to open the Reports page hours later, and the candidate's
// pipeline card never moved (the stage was only ever updated in the candidate's
// OWN browser store). Now every interview state change propagates server-side:
//
//   in_progress  → candidate stage "interviewing"
//   completed    → candidate stage "completed" + report generation
//
// …and an in-process loop (no external cron required) keeps it true:
//   • report sweep — completed interviews with no report (after a settle
//     window, so the room's own call goes first), with backoff + retries
//   • stage reconcile — backfills cards stuck in a pre-interview stage
//   • missing-report alert — completed > ALERT_AFTER_MS with no report → loud
//     log + one recruiter notification ("report not generated — retry")
// /api/cron/report-sweep still works as an extra trigger.

/** Stages an interview-driven transition may move a candidate OUT of (a stage a
 *  human set deliberately — cancelled, no-show, … — is left alone on reconcile). */
const BEFORE_INTERVIEW = ['pending', 'invited', 'scheduled']

/** Called on every interview status transition (PATCH, sweep). Event-driven: wins over the previous stage. */
export async function syncCandidateStage(interviewId: string, status: string, at: Date = new Date()) {
  try {
    const iv = await prisma.interview.findUnique({ where: { id: interviewId }, select: { candidateId: true, isDemo: true } })
    if (!iv || iv.isDemo) return
    if (status === 'in_progress') {
      await prisma.candidate.updateMany({ where: { id: iv.candidateId, status: { not: 'completed' } }, data: { status: 'interviewing' } })
    } else if (status === 'completed') {
      await prisma.candidate.update({ where: { id: iv.candidateId }, data: { status: 'completed' } })
      await prisma.candidate.updateMany({ where: { id: iv.candidateId, interviewedAt: null }, data: { interviewedAt: at } })
    }
  } catch (e) {
    console.error(JSON.stringify({ evt: 'candidate_stage_sync_failed', interviewId, status, detail: e instanceof Error ? e.message : String(e) }))
  }
}

/** Backfill: cards stuck before "Interviewing"/"Completed" while their interview has moved on. */
export async function reconcileStages(): Promise<{ interviewing: number; completed: number }> {
  const completed = await prisma.candidate.updateMany({
    where: { isDemo: false, status: { in: [...BEFORE_INTERVIEW, 'interviewing'] }, interview: { is: { status: 'completed', isDemo: false } } },
    data: { status: 'completed' },
  })
  const interviewing = await prisma.candidate.updateMany({
    where: { isDemo: false, status: { in: BEFORE_INTERVIEW }, interview: { is: { status: 'in_progress', isDemo: false } } },
    data: { status: 'interviewing' },
  })
  if (completed.count || interviewing.count) console.info(JSON.stringify({ evt: 'candidate_stage_reconciled', completed: completed.count, interviewing: interviewing.count }))
  return { interviewing: interviewing.count, completed: completed.count }
}

/** A completed interview with no report this long after completion is an incident. */
export const ALERT_AFTER_MS = 15 * 60_000

/** Loud log + ONE recruiter notification per interview for "completed, no report". */
export async function alertMissingReports(): Promise<number> {
  const now = Date.now()
  const rows = await prisma.interview.findMany({
    where: {
      isDemo: false, status: 'completed',
      completedAt: { lt: new Date(now - ALERT_AFTER_MS), gt: new Date(now - 14 * 86_400_000) },
      OR: [{ terminationReason: null }, { terminationReason: { not: 'CONSENT_WITHDRAWN' } }],
      candidate: { report: null },
    },
    select: { id: true, completedAt: true, reportStatus: true, reportError: true, reportAttempts: true, positionId: true, candidate: { select: { name: true } }, position: { select: { agencyId: true, title: true } } },
    take: 50,
  })
  let alerted = 0
  for (const r of rows) {
    console.error(JSON.stringify({ evt: 'report_missing_alert', interviewId: r.id, completedAt: r.completedAt, reportStatus: r.reportStatus, attempts: r.reportAttempts, error: r.reportError?.slice(0, 200) ?? null }))
    if (!r.position.agencyId) continue
    const already = await prisma.notification.findFirst({ where: { agencyId: r.position.agencyId, type: 'report_missing', metadata: { path: ['interviewId'], equals: r.id } }, select: { id: true } })
    if (already) continue
    await prisma.notification.create({
      data: {
        agencyId: r.position.agencyId, type: 'report_missing', title: 'Report not generated',
        body: `${r.candidate.name}'s interview for ${r.position.title} finished but its report hasn't been generated${r.reportError ? ` (${r.reportError.slice(0, 120)})` : ''}. It is retried automatically; you can also retry it from the Reports page.`,
        link: '/reports', metadata: { interviewId: r.id },
      },
    }).catch(() => {})
    alerted++
  }
  return alerted
}

/** One pass of the whole safety net. Never throws. */
export async function reportAutomationTick() {
  const out: Record<string, unknown> = {}
  out.sweep = await runReportSweep({ limit: 3 }).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }))
  out.stages = await reconcileStages().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }))
  out.alerts = await alertMissingReports().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }))
  return out
}

const TICK_MS = 2 * 60_000
const g = globalThis as unknown as { __levl1ReportLoop?: ReturnType<typeof setInterval> }

/**
 * Start the in-process safety net once per server process (idempotent). Called
 * from routes that run whenever interviews are live (heartbeat, lifecycle
 * PATCH, report views), so it's running whenever there's anything to do —
 * no external scheduler needed. Disable with SCREEN_REPORT_LOOP=0.
 */
export function ensureReportAutomation() {
  if (g.__levl1ReportLoop || process.env.SCREEN_REPORT_LOOP === '0' || process.env.NEXT_PHASE === 'phase-production-build') return
  g.__levl1ReportLoop = setInterval(() => { void reportAutomationTick() }, TICK_MS)
  // Don't keep a process alive just for this timer.
  ;(g.__levl1ReportLoop as unknown as { unref?: () => void }).unref?.()
  setTimeout(() => { void reportAutomationTick() }, 15_000)
  console.info(JSON.stringify({ evt: 'report_automation_started', tickMs: TICK_MS }))
}
