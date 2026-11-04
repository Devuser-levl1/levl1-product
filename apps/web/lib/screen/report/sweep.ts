import { NextRequest } from 'next/server'
import { POST as generateReport } from '@/app/api/generate-report/route'
import { findPendingReports, serverReportInput, markReport } from './pipeline'

// ── Report sweep (Fixpack 6 #3) — Screen-scoped ────────────────────────────
// Generates missing reports from server-persisted data, sequentially (one
// scoring call at a time). Used by the cron route and by the recruiter's
// Reports page (agency-scoped). Each attempt is counted; after
// MAX_AUTO_ATTEMPTS the interview stays visibly "failed" for manual retry.

let running = false   // per-process guard so overlapping triggers don't double-score

export async function runReportSweep(opts: { agencyId?: string; limit?: number } = {}): Promise<{ attempted: string[]; skipped: boolean }> {
  if (running) return { attempted: [], skipped: true }
  running = true
  const attempted: string[] = []
  try {
    const ids = await findPendingReports(opts)
    for (const id of ids) {
      attempted.push(id)
      const input = await serverReportInput(id)
      if (!input) continue
      try {
        const res = await generateReport(new NextRequest('http://internal/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }))
        if (!res.ok) console.warn('[report-sweep] generation failed for', id, res.status)
      } catch (e) {
        await markReport(id, 'failed', e instanceof Error ? e.message : String(e))
      }
    }
  } finally {
    running = false
  }
  return { attempted, skipped: false }
}
