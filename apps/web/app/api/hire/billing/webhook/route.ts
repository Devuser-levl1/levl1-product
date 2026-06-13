import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HIRE_PLANS, HirePlanId } from '@/lib/hire/plans'

export const dynamic = 'force-dynamic'

// Always return 200 so Cashfree doesn't retry-storm; idempotent via HireBillingEvent.orderId.
export async function POST(req: NextRequest) {
  try {
    const event = JSON.parse(await req.text())
    if (event.type !== 'PAYMENT_SUCCESS_WEBHOOK') return NextResponse.json({ received: true })

    const order = event.data?.order ?? {}
    const tenantId: string = order.customer_details?.customer_id ?? order.customer_id ?? ''
    const orderId: string = order.order_id ?? ''
    const planId: string = order.order_tags?.planId ?? ''
    const plan = HIRE_PLANS[planId as HirePlanId]

    if (!tenantId || !orderId || !plan) {
      console.warn('[hire/billing/webhook] missing data', { tenantId, orderId, planId })
      return NextResponse.json({ received: true })
    }

    // Idempotency — skip if this order was already processed.
    const seen = await prisma.hireBillingEvent.findUnique({ where: { orderId } })
    if (seen) { console.log('[hire/billing/webhook] duplicate ignored:', orderId); return NextResponse.json({ received: true }) }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.$transaction([
      prisma.hireTenant.update({
        where: { id: tenantId },
        data: {
          plan: planId as HirePlanId, trialActive: false, subscriptionStatus: 'active',
          currentPeriodEnd: periodEnd, usageCandidatesThisMonth: 0, usageInterviewsThisMonth: 0, usageResetAt: new Date(),
        },
      }),
      prisma.hireBillingEvent.create({ data: { tenantId, orderId, planId, amount: plan.price, status: 'success' } }),
    ])
    console.log('[hire/billing/webhook] tenant', tenantId, 'upgraded to', planId)
    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error('[hire/billing/webhook] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ received: true })
  }
}
