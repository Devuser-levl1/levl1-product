import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getScopes } from '@/lib/hire/scope'
import { can } from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const { client: clientWhere } = await getScopes(ctx)
  const clients = await prisma.hireClient.findMany({
    where: { tenantId: ctx.tenantId, ...clientWhere },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(clients)
})

export const POST = withHireAuth(async (req, ctx) => {
  if (!can(ctx.role, 'manageClients')) {
    console.warn('[hire/clients] create denied — role=%s (needs manageClients)', ctx.role)
    return NextResponse.json({ error: `Your role (${ctx.role}) can't create clients — an Admin or Manager can.` }, { status: 403 })
  }
  const body = await req.json()
  if (!body.name || !String(body.name).trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  const client = await prisma.hireClient.create({
    data: {
      tenantId: ctx.tenantId,
      name: String(body.name ?? ''),
      industry: body.industry ?? null,
      website: body.website ?? null,
    },
  })
  return NextResponse.json(client, { status: 201 })
})
