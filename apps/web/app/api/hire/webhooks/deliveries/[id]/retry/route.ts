import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { attemptDelivery } from '@/lib/api/webhooks'

export const dynamic = 'force-dynamic'

// Manually retry a single delivery (tenant-scoped via its endpoint).
export const POST = withHireAuth(async (_req, ctx, params) => {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: params.id } })
  if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id: delivery.endpointId, tenantId: ctx.tenantId } })
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Reset to pending so it can be re-attempted even if previously marked failed.
  await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'pending' } })
  const success = await attemptDelivery(delivery.id).catch(() => false)
  return NextResponse.json({ success })
})
