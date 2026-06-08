import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { PLANS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

function monthlyRevenue(plan: string): number {
  // price is in paise → convert to rupees
  return PLANS[plan] ? PLANS[plan].price / 100 : 0
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const [agencies, interviewsTotal, recent] = await Promise.all([
      prisma.agency.findMany({ select: { plan: true } }),
      prisma.interview.count(),
      prisma.interview.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          createdAt: true,
          runningScore: true,
          candidate: { select: { name: true, score: true } },
          position: { select: { title: true, company: true, agency: { select: { name: true } } } },
        },
      }),
    ])

    const mrr = agencies.reduce((sum, a) => sum + monthlyRevenue(a.plan), 0)
    const trialActive = agencies.filter((a) => a.plan === 'trial').length

    return NextResponse.json({
      mrr,
      agencyCount: agencies.length,
      interviewsTotal,
      trialActive,
      recentActivity: recent.map((i) => ({
        id: i.id,
        candidateName: i.candidate?.name ?? '—',
        position: i.position?.title ?? '—',
        company: i.position?.company ?? '—',
        agency: i.position?.agency?.name ?? '—',
        score: i.candidate?.score ?? i.runningScore ?? null,
        status: i.status,
        at: (i.scheduledAt ?? i.createdAt).toISOString(),
      })),
    })
  } catch (err) {
    console.error('[admin/stats] error:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
