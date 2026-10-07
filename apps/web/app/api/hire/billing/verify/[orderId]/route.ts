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

  // Bind the order to THIS tenant. Our orderIds are minted as
  // `hire_${tenantId.slice(-8)}_${ts}` in create-order, so an order belonging to
  // another tenant won't carry this tenant's prefix — reject before any upgrade.
  if (!orderId.startsWith(`hire_${ctx.tenantId.slice(-8)}_`)) {
    console.warn('[hire/billing/verify] order/tenant mismatch — tenant=%s order=%s', ctx.tenantId, orderId)
    return NextResponse.json({ error: 'This order does not belong to your account.' }, { status: 403 })
  }

  try {
    const cashfree = getCashfree()

    // Authoritative bind: the order's customer_id (set to the tenantId at
    // create-order) MUST equal this tenant. Blocks reuse of another tenant's
    // paid orderId even if the prefix somehow collided.
    try {
      const orderResp = await cashfree.PGFetchOrder(orderId)
      const customerId = orderResp.data?.customer_details?.customer_id
      if (customerId && customerId !== ctx.tenantId) {
        console.warn('[hire/billing/verify] customer_id mismatch — tenant=%s order-customer=%s', ctx.tenantId, customerId)
        return NextResponse.json({ error: 'This order does not belong to your account.' }, { status: 403 })
      }
      // Bind the plan to the order tag too, so a paid Starter order can't be
      // replayed with ?plan=Scale to over-upgrade.
      const orderPlan = (orderResp.data?.order_tags as Record<string, string> | undefined)?.planId
      if (orderPlan && planId && orderPlan !== planId) {
        console.warn('[hire/billing/verify] plan mismatch — requested=%s order=%s', planId, orderPlan)
        return NextResponse.json({ error: 'Plan does not match this order.' }, { status: 403 })
      }
    } catch (e) {
      console.error('[hire/billing/verify] PGFetchOrder failed (continuing on prefix bind):', e instanceof Error ? e.message : e)
    }

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
