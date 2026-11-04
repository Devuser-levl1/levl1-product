import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { runReportSweep } from '@/lib/screen/report/sweep'

export const dynamic = 'force-dynamic'

// POST — recruiter-triggered sweep for THIS agency (fired when the Reports page
// opens). Responds immediately; generation continues in the background so the
// page never waits on a scoring call. Fixpack 6 #3.
export async function POST(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  void runReportSweep({ agencyId: access.session.agencyId, limit: 3 })
    .catch((e) => console.error('[reports/sweep]', e instanceof Error ? e.message : e))
  return NextResponse.json({ ok: true, started: true })
}
