import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const sp = req.nextUrl.searchParams
    const status = sp.get('status')
    const agencyId = sp.get('agencyId')

    // Exclude demo-gallery runs (Build 05) from the review queue unless asked for.
    const where: Prisma.InterviewWhereInput = sp.get('includeDemo') === 'true' ? {} : { isDemo: false }
    if (status && status !== 'all') where.status = status
    if (agencyId && agencyId !== 'all') where.position = { agencyId }

    const interviews = await prisma.interview.findMany({
      where,
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, scheduledAt: true, createdAt: true, runningScore: true,
        candidate: { select: { name: true, score: true } },
        position: { select: { title: true, company: true, agency: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(
      interviews.map((i) => ({
        id: i.id,
        candidateName: i.candidate?.name ?? '—',
        position: i.position?.title ?? '—',
        company: i.position?.company ?? '—',
        agency: i.position?.agency?.name ?? '—',
        agencyId: i.position?.agency?.id ?? null,
        score: i.candidate?.score ?? i.runningScore ?? null,
        status: i.status,
        at: (i.scheduledAt ?? i.createdAt).toISOString(),
      })),
    )
  } catch (err) {
    console.error('[admin/interviews] error:', err)
    return NextResponse.json({ error: 'Failed to load interviews' }, { status: 500 })
  }
}
