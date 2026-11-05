import { NextRequest, NextResponse } from 'next/server'
import { Cashfree, CFEnvironment } from 'cashfree-pg'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { PLANS } from '@/lib/plans'
import { appUrl } from '@/lib/screen/app-url'

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

export async function POST(req: NextRequest) {
  try {
    // Billing is admin-only (Screen RBAC).
    const access = recruiterAccess(req, { admin: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const session = access.session
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }

    const { planId } = await req.json()
    const plan = PLANS[planId]
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const agency = await prisma.agency.findUnique({
      where:   { id: session.agencyId },
      include: { users: { take: 1, orderBy: { createdAt: 'asc' } } },
    })
    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    }

    const orderId       = `levl1_${agency.id}_${Date.now()}`
    const customerPhone = '9999999999' // Cashfree requires phone
    const baseUrl        = appUrl()

    const orderRequest = {
      order_amount:   plan.price / 100, // Cashfree uses rupees
      order_currency: 'INR',
      order_id:       orderId,
      customer_details: {
        customer_id:    agency.id,
        customer_name:  agency.name,
        customer_email: agency.billingEmail ?? agency.users[0]?.email ?? '',
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url:  `${baseUrl}/settings?section=billing&order_id={order_id}&plan=${planId}`,
        notify_url:  `${baseUrl}/api/payments/webhook`,
      },
      order_note: `Levl1 ${plan.name} Plan - ${agency.name}`,
    }

    const cashfree = getCashfree()
    const response  = await cashfree.PGCreateOrder(orderRequest)

    return NextResponse.json({
      orderId:          response.data.order_id,
      paymentSessionId: response.data.payment_session_id,
      planId,
      planName:         plan.name,
      amount:           plan.price / 100,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create order'
    console.error('[payments/create-order] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
