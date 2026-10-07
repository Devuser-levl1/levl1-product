import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { HIRE_PLANS, HirePlanId } from '@/lib/hire/plans'

export const dynamic = 'force-dynamic'

// Cashfree webhook signature = base64( HMAC-SHA256( `${timestamp}${rawBody}`, secret ) ),
// sent in the `x-webhook-signature` header with `x-webhook-timestamp`.
function verifyCashfreeSignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY
  // Fail closed: no secret / no headers → cannot trust the payload.
  if (!secret || !signature || !timestamp) return false
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Cashfree payment webhook. We VERIFY THE SIGNATURE before trusting anything —
// otherwise a forged POST could upgrade any tenant (customer_id is caller-
// supplied). Idempotent via HireBillingEvent.orderId, only after signature passes.
export async function POST(req: NextRequest) {
  // Read the RAW body once — signature is computed over the exact bytes.
  const rawBody = await req.text()
  const signature = req.headers.get('x-webhook-signature')
  const timestamp = req.headers.get('x-webhook-timestamp')

  if (!verifyCashfreeSignature(rawBody, signature, timestamp)) {
    console.warn('[hire/billing/webhook] REJECTED — invalid or missing signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const event = JSON.parse(rawBody)
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
          currentPeriodEnd: periodEnd, usageCandidatesThisMonth: 0, usageResetAt: new Date(),
        },
      }),
      prisma.hireBillingEvent.create({ data: { tenantId, orderId, planId, amount: plan.price, status: 'success' } }),
    ])
    console.log('[hire/billing/webhook] tenant', tenantId, 'upgraded to', planId)
    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    console.error('[hire/billing/webhook] error:', err instanceof Error ? err.message : err)
    // Signature already verified — return 200 so Cashfree doesn't retry-storm on a transient DB error.
    return NextResponse.json({ received: true })
  }
}
