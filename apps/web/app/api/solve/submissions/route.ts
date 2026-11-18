import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { runSolveSweep } from '@/lib/screen/solve/sweep'

export const dynamic = 'force-dynamic'

// GET → every Solve take-home in the agency (pipeline view) + positions using Solve.
export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  await runSolveSweep({ agencyId, limit: 2 }).catch(() => null)
  const [rows, positions] = await Promise.all([
    prisma.solveSubmission.findMany({
      where: { agencyId },
      orderBy: { invitedAt: 'desc' },
      take: 300,
      select: {
        id: true, status: true, invitedAt: true, expiresAt: true, startedAt: true, deadlineAt: true, submittedAt: true, autoSubmitted: true,
        submissionQuality: true, defenseStatus: true, score: true, recommendation: true, reportStatus: true, isDemo: true,
        candidate: { select: { id: true, name: true, email: true } },
        position: { select: { id: true, title: true, company: true } },
      },
    }),
    prisma.solveAssignment.findMany({ where: { agencyId, enabled: true }, select: { position: { select: { id: true, title: true, company: true } } } }),
  ])
  return NextResponse.json({ submissions: rows, positions: positions.map((p) => p.position) })
}
