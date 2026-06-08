import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { PLANS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const agencies = await prisma.agency.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        users: { select: { lastLoginAt: true } },
        _count: { select: { positions: true } },
      },
    })

    return NextResponse.json(
      agencies.map((a) => {
        const lastActive = a.users
          .map((u) => u.lastLoginAt)
          .filter((d): d is Date => !!d)
          .sort((x, y) => y.getTime() - x.getTime())[0] ?? a.updatedAt

        return {
          id: a.id,
          name: a.name,
          email: a.billingEmail ?? a.senderEmail ?? '',
          plan: a.plan,
          interviewsUsed: a.interviewsUsed,
          interviewsLimit: a.plan === 'trial' ? a.trialLimit : a.interviewsLimit,
          trialExpiresAt: a.trialExpiresAt?.toISOString() ?? null,
          positionCount: a._count.positions,
          mrr: PLANS[a.plan] ? PLANS[a.plan].price / 100 : 0,
          lastActive: lastActive?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        }
      }),
    )
  } catch (err) {
    console.error('[admin/agencies] error:', err)
    return NextResponse.json({ error: 'Failed to load agencies' }, { status: 500 })
  }
}
