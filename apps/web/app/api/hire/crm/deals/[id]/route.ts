import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'

export const dynamic = 'force-dynamic'

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireDeal.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string') data.title = body.title
  if (body.value != null) data.value = Number(body.value)
  if (body.probability != null) data.probability = Number(body.probability)
  if ('notes' in body) data.notes = body.notes || null
  if (typeof body.stage === 'string') {
    data.stage = body.stage
    if (body.stage === 'Closed Won' || body.stage === 'Closed Lost') {
      if (!existing.closedAt) data.closedAt = new Date()
    } else {
      data.closedAt = null
    }
  }
  const deal = await prisma.hireDeal.update({ where: { id: existing.id }, data })
  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'deal_update', targetType: 'deal', targetId: deal.id, targetName: deal.title, meta: { fields: Object.keys(data) } })
  return NextResponse.json(deal)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireDeal.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'deal_delete', targetType: 'deal', targetId: existing.id, targetName: existing.title })
  await prisma.hireDeal.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
})
