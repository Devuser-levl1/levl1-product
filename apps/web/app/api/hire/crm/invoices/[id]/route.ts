import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { deriveStatus } from '@/lib/hire/ar'

export const dynamic = 'force-dynamic'

async function owned(tenantId: string, id: string) {
  return prisma.hireInvoice.findFirst({ where: { id, tenantId } })
}

// GET — one invoice incl. client/deal + reminder log.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const inv = await prisma.hireInvoice.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { client: { select: { id: true, name: true } }, deal: { select: { id: true, title: true } }, reminders: { orderBy: { sentAt: 'desc' } } },
  })
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(inv)
})

// PATCH — record a payment (mark paid / partial), toggle reminders, or edit fields.
// `markPaid: true` is a convenience that settles the full balance and stops reminders.
export const PATCH = withHireAuth(async (req, ctx, params) => {
  const inv = await owned(ctx.tenantId, params.id)
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  const data: Record<string, unknown> = {}

  // Determine the resulting paid amount.
  let amountPaid = inv.amountPaid
  if (body.markPaid === true) amountPaid = inv.amount
  else if (Number.isFinite(Number(body.amountPaid))) amountPaid = Math.max(0, Math.min(inv.amount, Number(body.amountPaid)))

  if (amountPaid !== inv.amountPaid || body.markPaid === true) {
    const status = deriveStatus(inv.amount, amountPaid)
    data.amountPaid = amountPaid
    data.status = status
    data.paidAt = status === 'paid' ? new Date() : null
  }

  if (typeof body.remindersOn === 'boolean') data.remindersOn = body.remindersOn
  if (Number.isFinite(Number(body.reminderIntervalDays)) && Number(body.reminderIntervalDays) > 0) data.reminderIntervalDays = Math.round(Number(body.reminderIntervalDays))
  if (body.dueDate) data.dueDate = new Date(body.dueDate)
  if (typeof body.notes === 'string') data.notes = body.notes
  if (typeof body.number === 'string') data.number = body.number.slice(0, 60)

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const updated = await prisma.hireInvoice.update({ where: { id: inv.id }, data, include: { client: { select: { id: true, name: true } }, deal: { select: { id: true, title: true } }, _count: { select: { reminders: true } } } })

  if (updated.status === 'paid' && inv.status !== 'paid') {
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'invoice_paid', targetType: 'invoice', targetId: inv.id, targetName: inv.number ?? `${inv.currency} ${inv.amount}` })
  }
  return NextResponse.json(updated)
})

// DELETE — remove an invoice (reminders cascade).
export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const inv = await owned(ctx.tenantId, params.id)
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.hireInvoice.delete({ where: { id: inv.id } })
  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'invoice_delete', targetType: 'invoice', targetId: inv.id, targetName: inv.number ?? `${inv.currency} ${inv.amount}` })
  return NextResponse.json({ ok: true })
})
