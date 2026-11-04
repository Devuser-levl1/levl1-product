import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { MAX_AUTO_ATTEMPTS } from '@/lib/screen/report/pipeline'

export const dynamic = 'force-dynamic'

// GET — this agency's completed interviews that have NO report yet, with the
// pipeline status, so the Reports page can show "Generating…" / "Report failed"
// instead of nothing. Fixpack 6 #3.
export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const rows = await prisma.interview.findMany({
    where: {
      isDemo: false, status: 'completed',
      position: { agencyId: access.session.agencyId },
      candidate: { report: null },
    },
    select: {
      id: true, candidateId: true, completedAt: true, terminationReason: true,
      reportStatus: true, reportError: true, reportAttempts: true,
    },
    orderBy: { completedAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(rows.map((r) => ({ ...r, autoRetryExhausted: r.reportAttempts >= MAX_AUTO_ATTEMPTS })))
}
