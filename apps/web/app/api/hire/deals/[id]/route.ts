import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const deal = await prisma.hireDeal.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  })
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(deal)
})
