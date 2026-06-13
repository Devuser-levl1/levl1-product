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

export const POST = withHireAuth(async (req, ctx) => {
  const { planId } = await req.json()
  const plan = HIRE_PLANS[planId as HirePlanId]
  if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId } })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  const admin = await prisma.hireUser.findFirst({ where: { tenantId: ctx.tenantId, role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const orderId = `hire_${ctx.tenantId.slice(-8)}_${Date.now()}`

  try {
    const cashfree = getCashfree()
    const resp = await cashfree.PGCreateOrder({
      order_amount: plan.price / 100,
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: ctx.tenantId,
        customer_name: tenant.name,
        customer_email: admin?.email || 'billing@levl1.io',
        customer_phone: '9999999999',
      },
      order_meta: {
        return_url: `${appUrl}/hire/settings/billing?order_id={order_id}&plan=${planId}`,
        notify_url: `${appUrl}/api/hire/billing/webhook`,
      },
      order_note: `Levl1 Hire ${plan.name}`,
      order_tags: { product: 'hire', planId },
    })
    return NextResponse.json({ orderId: resp.data.order_id, paymentSessionId: resp.data.payment_session_id, planId, amount: plan.price / 100, planName: plan.name })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create order'
    console.error('[hire/billing/create-order] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
