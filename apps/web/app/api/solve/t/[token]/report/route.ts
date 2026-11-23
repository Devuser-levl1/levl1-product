import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loadByToken } from '@/lib/screen/solve/session'
import { SUBMISSION_VIEW_SELECT, buildSubmissionView } from '@/lib/screen/solve/view'
import { queueSolveReport } from '@/lib/screen/solve/report'

export const dynamic = 'force-dynamic'

// GET → the prospect's OWN report — DEMO take-homes only. Real candidates never
// see their report (the hiring team does): anything not isDemo is a 404, so a
// real candidate's link can't be used to read an evaluation.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const s = await loadByToken(params.token)
  if (!s || !s.isDemo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const row = await prisma.solveSubmission.findUnique({ where: { id: s.id }, select: { ...SUBMISSION_VIEW_SELECT, reportAttempts: true } })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // A prospect is waiting on this page — don't leave a missing/failed demo
  // report for the cron sweep (≤3 attempts, same as the sweep).
  const ready = row.status === 'submitted' && ['not_required', 'completed', 'expired'].includes(row.defenseStatus)
  if (ready && (row.reportStatus === null || (row.reportStatus === 'failed' && row.reportAttempts < 3))) queueSolveReport(row.id)
  return NextResponse.json(buildSubmissionView(row, false))
}
