import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { PLANS, PLAN_LIMITS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const VALID_PLANS = ['trial', 'starter', 'professional', 'enterprise', 'expired']

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { plan } = await req.json()
    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const limit = PLAN_LIMITS[plan] ?? PLANS[plan]?.interviewsPerMonth ?? 5
    const interviewsLimit = Number.isFinite(limit) ? limit : 999999

    const data: Record<string, unknown> = { plan, interviewsLimit }
    if (plan === 'starter' || plan === 'professional' || plan === 'enterprise') {
      data.subscriptionStatus = 'active'
      data.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      data.interviewsUsed = 0
    }

    await prisma.agency.update({ where: { id: params.id }, data })
    console.log('[admin] Changed plan for agency', params.id, '→', plan)
    return NextResponse.json({ ok: true, plan, interviewsLimit })
  } catch (err) {
    console.error('[admin/change-plan] error:', err)
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
}
