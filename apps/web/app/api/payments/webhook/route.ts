import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { PLANS, PLAN_LIMITS } from '@/lib/plans'

/** Verify Cashfree webhook signature (HMAC-SHA256 of timestamp + payload) */
function verifyWebhookSignature(
  rawBody:   string,
  timestamp: string,
  signature: string,
): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY ?? ''
  const message = `${timestamp}${rawBody}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(expected, 'base64'),
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody  = await req.text()
    const timestamp = req.headers.get('x-webhook-timestamp') ?? ''
    const signature = req.headers.get('x-webhook-signature') ?? ''

    // Verify signature in production
    if (process.env.CASHFREE_ENV === 'PROD' && signature) {
      if (!verifyWebhookSignature(rawBody, timestamp, signature)) {
        console.warn('[payments/webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(rawBody)
    console.log('[payments/webhook] Event type:', event.type)

    if (event.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const order     = event.data?.order ?? {}
      const agencyId  = order.customer_details?.customer_id ?? ''
      const note: string = order.order_note ?? ''

      // Extract planId from order note ("Levl1 Starter Plan - ...")
      const planId = Object.keys(PLANS).find(k =>
        note.toLowerCase().includes(PLANS[k].name.toLowerCase())
      )

      if (!agencyId || !planId) {
        console.error('[payments/webhook] Missing agencyId or planId', { agencyId, planId, note })
        return NextResponse.json({ received: true })
      }

      const plan = PLANS[planId]
      const now  = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await prisma.$transaction(async (tx) => {
        await tx.agency.update({
          where: { id: agencyId },
          data: {
            plan:               planId,
            interviewsLimit:    PLAN_LIMITS[planId] ?? plan.interviewsPerMonth,
            subscriptionStatus: 'active',
            currentPeriodEnd:   periodEnd,
            interviewsUsed:     0, // reset on new billing period
          },
        })

        await tx.subscription.create({
          data: {
            agencyId,
            plan:               planId,
            status:             'active',
            cashfreeSubId:      order.order_id,
            amount:             Math.round((order.order_amount ?? 0) * 100), // rupees → paise
            currency:           'INR',
            currentPeriodStart: now,
            currentPeriodEnd:   periodEnd,
          },
        })
      })

      console.log('[payments/webhook] Upgraded agency', agencyId, 'to', planId)
    }

    if (event.type === 'PAYMENT_FAILED_WEBHOOK') {
      console.log('[payments/webhook] Payment failed for order:', event.data?.order?.order_id)
    }

    if (event.type === 'SUBSCRIPTION_STATUS_CHANGE') {
      // Handle subscription renewals / cancellations
      const sub = event.data?.subscription ?? {}
      const agencyId = sub.customer_id
      const status   = sub.subscription_status

      if (agencyId && status === 'CANCELLED') {
        await prisma.agency.update({
          where: { id: agencyId },
          data:  { subscriptionStatus: 'cancelled', plan: 'expired' },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error'
    console.error('[payments/webhook] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
