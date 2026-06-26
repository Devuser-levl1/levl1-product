import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { deriveStatus } from '@/lib/hire/ar'

export const dynamic = 'force-dynamic'

// GET /api/hire/crm/invoices — all invoices for this tenant (newest first).
export const GET = withHireAuth(async (_req, ctx) => {
  const invoices = await prisma.hireInvoice.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      client: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
      _count: { select: { reminders: true } },
    },
    orderBy: { sentDate: 'desc' },
  })
  return NextResponse.json({ invoices })
})

// POST /api/hire/crm/invoices — raise an invoice against a client (optionally a deal).
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const amount = Number(body.amount)
  if (!body.clientId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Client and a positive amount are required' }, { status: 400 })
  }

  // Verify the client belongs to this tenant.
  const client = await prisma.hireClient.findFirst({ where: { id: body.clientId, tenantId: ctx.tenantId }, select: { id: true } })
  if (!client) return NextResponse.json({ error: 'Invalid client' }, { status: 400 })

  // Verify the deal (if any) belongs to this tenant + client.
  let dealId: string | null = null
  if (body.dealId) {
    const deal = await prisma.hireDeal.findFirst({ where: { id: body.dealId, tenantId: ctx.tenantId, clientId: body.clientId }, select: { id: true } })
    if (!deal) return NextResponse.json({ error: 'Invalid deal for this client' }, { status: 400 })
    dealId = deal.id
  }

  // Tenant defaults fill in any unspecified cadence values.
  const tenant = await prisma.hireTenant.findUnique({ where: { id: ctx.tenantId }, select: { arDueCycleDays: true, arReminderIntervalDays: true } })
  const dueCycleDays = Number.isFinite(Number(body.dueCycleDays)) && Number(body.dueCycleDays) > 0 ? Math.round(Number(body.dueCycleDays)) : (tenant?.arDueCycleDays ?? 30)
  const reminderIntervalDays = Number.isFinite(Number(body.reminderIntervalDays)) && Number(body.reminderIntervalDays) > 0 ? Math.round(Number(body.reminderIntervalDays)) : (tenant?.arReminderIntervalDays ?? 7)

  const sentDate = body.sentDate ? new Date(body.sentDate) : new Date()
  const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(sentDate.getTime() + dueCycleDays * 86400000)
  const amountPaid = Number(body.amountPaid) > 0 ? Number(body.amountPaid) : 0

  const invoice = await prisma.hireInvoice.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: client.id,
      dealId,
      number: body.number ? String(body.number).slice(0, 60) : null,
      amount,
      amountPaid,
      currency: body.currency === 'USD' ? 'USD' : 'INR',
      sentDate,
      dueDate,
      dueCycleDays,
      reminderIntervalDays,
      status: deriveStatus(amount, amountPaid),
      paidAt: deriveStatus(amount, amountPaid) === 'paid' ? new Date() : null,
      notes: body.notes ? String(body.notes) : null,
    },
    include: { client: { select: { id: true, name: true } }, deal: { select: { id: true, title: true } }, _count: { select: { reminders: true } } },
  })

  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'invoice_create', targetType: 'invoice', targetId: invoice.id, targetName: invoice.number ?? `${invoice.currency} ${amount}` })
  return NextResponse.json(invoice, { status: 201 })
})
