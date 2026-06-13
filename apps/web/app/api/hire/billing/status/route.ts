import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getLimits } from '@/lib/hire/usage'
import { HIRE_PLANS, HirePlanId } from '@/lib/hire/plans'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId } })
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Lazy period-end check: flip an active sub to past_due once the period lapses.
  if (!tenant.trialActive && tenant.subscriptionStatus === 'active' && tenant.currentPeriodEnd && tenant.currentPeriodEnd.getTime() < Date.now()) {
    await prisma.hireTenant.update({ where: { id: ctx.tenantId }, data: { subscriptionStatus: 'past_due' } })
    tenant.subscriptionStatus = 'past_due'
  }

  const limits = getLimits(tenant)
  const activeJobs = await prisma.hireJob.count({ where: { tenantId: ctx.tenantId, status: 'ACTIVE' } })
  const seats = await prisma.hireUser.count({ where: { tenantId: ctx.tenantId } })
  const trialDaysLeft = tenant.trialActive && tenant.trialEndsAt ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / 86400000)) : null
  const history = await prisma.hireBillingEvent.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { createdAt: 'desc' }, take: 10 })

  return NextResponse.json({
    plan: tenant.plan,
    planName: HIRE_PLANS[tenant.plan as HirePlanId]?.name ?? 'Trial',
    trialActive: tenant.trialActive,
    trialDaysLeft,
    subscriptionStatus: tenant.subscriptionStatus,
    currentPeriodEnd: tenant.currentPeriodEnd?.toISOString() ?? null,
    limits,
    usage: {
      candidates: tenant.usageCandidatesThisMonth,
      interviews: tenant.usageInterviewsThisMonth,
      activeJobs,
      seats,
    },
    history: history.map((h) => ({ date: h.createdAt.toISOString(), planId: h.planId, amount: h.amount, status: h.status })),
  })
})
