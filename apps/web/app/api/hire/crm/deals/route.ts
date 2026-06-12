import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { DEAL_STAGES } from '@/lib/hire/constants'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const deals = await prisma.hireDeal.findMany({
    where: { tenantId: ctx.tenantId },
    include: { client: { select: { id: true, name: true, logoUrl: true } } },
    orderBy: [{ stage: 'asc' }, { value: 'desc' }],
  })
  const grouped = DEAL_STAGES.map((stage) => {
    const list = deals.filter((d) => d.stage === stage)
    return { stage, deals: list, totalValue: list.reduce((sum, d) => sum + d.value, 0) }
  })
  return NextResponse.json({ deals, grouped })
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  if (!body.clientId || !body.title) return NextResponse.json({ error: 'Client and title are required' }, { status: 400 })
  // Ensure the client belongs to this tenant
  const client = await prisma.hireClient.findFirst({ where: { id: body.clientId, tenantId: ctx.tenantId } })
  if (!client) return NextResponse.json({ error: 'Invalid client' }, { status: 400 })

  const deal = await prisma.hireDeal.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: body.clientId,
      title: String(body.title),
      value: Number(body.value) || 0,
      stage: body.stage || 'Discovery',
      probability: Number(body.probability) || 10,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(deal, { status: 201 })
})
