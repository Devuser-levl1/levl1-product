import { NextRequest, NextResponse } from 'next/server'
import { Cashfree, CFEnvironment } from 'cashfree-pg'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { PLANS, PLAN_LIMITS } from '@/lib/plans'

function getCashfree() {
  const env = process.env.CASHFREE_ENV === 'PROD'
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX
  return new Cashfree(
    env,
    process.env.CASHFREE_APP_ID     ?? '',
    process.env.CASHFREE_SECRET_KEY ?? '',
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } },
) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { orderId } = params
    const planId      = req.nextUrl.searchParams.get('plan') ?? ''

    const cashfree   = getCashfree()
    const response   = await cashfree.PGOrderFetchPayments(orderId)
    const payments   = response.data ?? []
    const success    = payments.some((p) => p.payment_status === 'SUCCESS')

    if (success && planId && PLANS[planId]) {
      const plan      = PLANS[planId]
      const now       = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await prisma.agency.update({
        where: { id: session.agencyId },
        data:  {
          plan:               planId,
          interviewsLimit:    PLAN_LIMITS[planId] ?? plan.interviewsPerMonth,
          subscriptionStatus: 'active',
          currentPeriodEnd:   periodEnd,
          interviewsUsed:     0,
        },
      })
    }

    return NextResponse.json({
      success,
      orderId,
      planId: success ? planId : null,
      payments,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed'
    console.error('[payments/verify] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
