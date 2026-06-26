import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { requireCap } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const denied = requireCap(ctx, 'deals'); if (denied) return denied
  const deal = await prisma.hireDeal.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  })
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(deal)
})
