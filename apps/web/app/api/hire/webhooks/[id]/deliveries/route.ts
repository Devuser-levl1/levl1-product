import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Recent deliveries for a webhook endpoint (tenant-scoped).
export const GET = withHireAuth(async (_req, ctx, params) => {
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!ep) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { endpointId: ep.id },
    select: { id: true, event: true, status: true, attempts: true, lastError: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json(deliveries)
})
