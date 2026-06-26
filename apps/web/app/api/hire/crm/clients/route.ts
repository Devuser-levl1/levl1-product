import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getScopes, requireCap } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

// Scoped: recruiters see only their assigned clients; managers/admins see all.
// (Used by client pickers across roles, so scoped rather than blocked.)
export const GET = withHireAuth(async (_req, ctx) => {
  const { client: clientWhere } = await getScopes(ctx)
  const clients = await prisma.hireClient.findMany({
    where: { tenantId: ctx.tenantId, ...clientWhere },
    include: {
      contacts: true,
      deals: { where: { stage: { not: 'Closed Lost' } }, select: { id: true, value: true, stage: true } },
      jobs: { where: { status: 'ACTIVE' }, select: { id: true, title: true } },
      _count: { select: { contacts: true, deals: true, jobs: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(clients)
})

// Creating clients is a manager/admin action (recruiters work within assigned clients).
export const POST = withHireAuth(async (req, ctx) => {
  const denied = requireCap(ctx, 'assignClients'); if (denied) return denied
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })

  const client = await prisma.hireClient.create({
    data: {
      tenantId: ctx.tenantId,
      name: String(body.name),
      industry: body.industry || null,
      website: body.website || null,
      logoUrl: body.logoUrl || null,
    },
  })

  // Optional primary contact
  if (body.contactName && body.contactEmail) {
    await prisma.hireContact.create({
      data: { clientId: client.id, name: String(body.contactName), email: String(body.contactEmail), role: body.contactRole || null },
    })
  }
  return NextResponse.json(client, { status: 201 })
})
