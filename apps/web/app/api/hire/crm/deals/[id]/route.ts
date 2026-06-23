import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { parseEconomics, validJobIds } from '@/lib/hire/deal-input'

export const dynamic = 'force-dynamic'

const ECON_KEYS = ['positions', 'billRate', 'hoursPerWeek', 'durationValue', 'durationUnit', 'margin']

// Deals are fully editable at ANY stage.
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

  // Economics — recompute `value` from the FULL set (existing merged with the
  // edited fields) so partial edits still recalculate correctly mid-deal.
  if (ECON_KEYS.some((k) => k in body)) {
    const merged = {
      positions: 'positions' in body ? body.positions : existing.positions,
      billRate: 'billRate' in body ? body.billRate : existing.billRate,
      hoursPerWeek: 'hoursPerWeek' in body ? body.hoursPerWeek : existing.hoursPerWeek,
      durationValue: 'durationValue' in body ? body.durationValue : existing.durationValue,
      durationUnit: 'durationUnit' in body ? body.durationUnit : existing.durationUnit,
      margin: 'margin' in body ? body.margin : existing.margin,
    }
    const { fields, computedValue } = parseEconomics(merged)
    Object.assign(data, fields)
    if (computedValue != null) data.value = computedValue
  }

  // Optional, replaceable job links.
  if ('jobIds' in body) {
    const jobIds = await validJobIds(ctx.tenantId, body.jobIds)
    data.jobs = { set: jobIds.map((id) => ({ id })) }
  }

  const deal = await prisma.hireDeal.update({
    where: { id: existing.id },
    data,
    include: { jobs: { select: { id: true, title: true } }, client: { select: { id: true, name: true } } },
  })
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
