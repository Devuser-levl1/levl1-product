import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { summarize } from '@/lib/hire/ar'
import { requireCap } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

// GET /api/hire/crm/ar/summary — AR dashboard aggregates (Admin-only).
export const GET = withHireAuth(async (_req, ctx) => {
  const denied = requireCap(ctx, 'ar'); if (denied) return denied
  const invoices = await prisma.hireInvoice.findMany({
    where: { tenantId: ctx.tenantId },
    select: { amount: true, amountPaid: true, dueDate: true, status: true, clientId: true, client: { select: { name: true } } },
  })
  const summary = summarize(invoices.map((i) => ({ amount: i.amount, amountPaid: i.amountPaid, dueDate: i.dueDate, status: i.status, clientId: i.clientId, clientName: i.client.name })))
  return NextResponse.json(summary)
})
