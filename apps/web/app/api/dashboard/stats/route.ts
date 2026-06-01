import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const agencyId = session.agencyId

    const [
      positions,
      candidates,
      completedInterviews,
      scheduledInterviews,
      topCandidates,
      upcomingInterviewsRaw,
    ] = await Promise.all([
      prisma.position.findMany({
        where: { agencyId },
        select: { id: true, status: true, title: true, company: true },
      }),
      prisma.candidate.findMany({
        where: { position: { agencyId } },
        select: { id: true, score: true, status: true },
      }),
      prisma.interview.count({
        where: { position: { agencyId }, status: 'completed' },
      }),
      prisma.interview.count({
        where: { position: { agencyId }, status: 'scheduled' },
      }),
      prisma.candidate.findMany({
        where: { position: { agencyId }, status: 'completed', score: { not: null } },
        orderBy: { score: 'desc' },
        take: 5,
        select: {
          id: true, name: true, email: true, score: true, recommendation: true,
          positionId: true,
          interview: { select: { id: true } },
          position: { select: { title: true, company: true } },
        },
      }),
      prisma.interview.findMany({
        where: { position: { agencyId }, status: { in: ['scheduled', 'in_progress'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: {
          candidate: { select: { id: true, name: true } },
          position: { select: { id: true, title: true, company: true } },
        },
      }),
    ])

    const scoredCandidates = candidates.filter(c => c.score != null)
    const avgScore = scoredCandidates.length > 0
      ? Math.round(scoredCandidates.reduce((a, c) => a + (c.score ?? 0), 0) / scoredCandidates.length)
      : 0

    return NextResponse.json({
      activePositions:      positions.filter(p => p.status === 'active').length,
      totalPositions:       positions.length,
      totalCandidates:      candidates.length,
      completedInterviews,
      scheduledInterviews,
      avgScore,
      scoredCount:          scoredCandidates.length,
      topCandidates,
      upcomingInterviews:   upcomingInterviewsRaw,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stats query failed'
    console.error('[dashboard/stats]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
