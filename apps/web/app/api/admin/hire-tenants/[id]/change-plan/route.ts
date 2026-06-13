import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const PLANS = ['STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE']

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = requireAdmin(req); if (denied) return denied
  const { plan } = await req.json()
  if (!PLANS.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  await prisma.hireTenant.update({
    where: { id: params.id },
    data: { plan, trialActive: false, subscriptionStatus: 'active', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), usageCandidatesThisMonth: 0, usageInterviewsThisMonth: 0, usageResetAt: new Date() },
  })
  return NextResponse.json({ ok: true, plan })
}
