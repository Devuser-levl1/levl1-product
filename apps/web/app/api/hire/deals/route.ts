import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { requireCap } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const denied = requireCap(ctx, 'deals'); if (denied) return denied
  const deals = await prisma.hireDeal.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(deals)
})

export const POST = withHireAuth(async (req, ctx) => {
  const denied = requireCap(ctx, 'deals'); if (denied) return denied
  const body = await req.json()
  const deal = await prisma.hireDeal.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: String(body.clientId ?? ''),
      title: String(body.title ?? ''),
      value: Number(body.value ?? 0),
      stage: body.stage ?? 'Discovery',
      probability: Number(body.probability ?? 10),
    },
  })
  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'deal_create', targetType: 'deal', targetId: deal.id, targetName: deal.title, meta: { value: deal.value, stage: deal.stage } })
  return NextResponse.json(deal, { status: 201 })
})
