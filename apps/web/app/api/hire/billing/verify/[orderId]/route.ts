import { NextResponse } from 'next/server'
import { Cashfree, CFEnvironment } from 'cashfree-pg'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { HIRE_PLANS, HirePlanId } from '@/lib/hire/plans'

export const dynamic = 'force-dynamic'

function getCashfree() {
  const env = process.env.CASHFREE_ENV === 'PROD' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX
  return new Cashfree(env, process.env.CASHFREE_APP_ID ?? '', process.env.CASHFREE_SECRET_KEY ?? '')
}

export const GET = withHireAuth(async (req, ctx, params) => {
  const orderId = params.orderId
  const planId = new URL(req.url).searchParams.get('plan') ?? ''
  try {
    const cashfree = getCashfree()
    const resp = await cashfree.PGOrderFetchPayments(orderId)
    const payments = resp.data ?? []
    const paid = payments.some((p) => p.payment_status === 'SUCCESS')

    // Defensive: if paid but the webhook hasn't landed yet, upgrade here too (idempotent).
    if (paid && planId && HIRE_PLANS[planId as HirePlanId]) {
      const seen = await prisma.hireBillingEvent.findUnique({ where: { orderId } })
      if (!seen) {
        const plan = HIRE_PLANS[planId as HirePlanId]
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        await prisma.$transaction([
          prisma.hireTenant.update({ where: { id: ctx.tenantId }, data: { plan: planId as HirePlanId, trialActive: false, subscriptionStatus: 'active', currentPeriodEnd: periodEnd, usageCandidatesThisMonth: 0, usageResetAt: new Date() } }),
          prisma.hireBillingEvent.create({ data: { tenantId: ctx.tenantId, orderId, planId, amount: plan.price, status: 'success' } }),
        ]).catch(() => {})
      }
    }
    return NextResponse.json({ paid, status: paid ? 'PAID' : 'PENDING', planId: paid ? planId : null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Verify failed' }, { status: 500 })
  }
})
