import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req); if (denied) return denied
  const tenants = await prisma.hireTenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, jobs: true, candidates: true } } },
  })
  return NextResponse.json(tenants.map((t) => ({
    id: t.id, name: t.name, type: t.type, plan: t.plan, trialActive: t.trialActive,
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null, subscriptionStatus: t.subscriptionStatus,
    usageCandidates: t.usageCandidatesThisMonth,
    users: t._count.users, jobs: t._count.jobs, candidates: t._count.candidates, createdAt: t.createdAt.toISOString(),
  })))
}
