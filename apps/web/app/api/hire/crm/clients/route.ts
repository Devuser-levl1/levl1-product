import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getScopes } from '@/lib/hire/scope'
import { can } from '@/lib/hire/permissions'

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

// Creating clients is an admin/manager action (recruiters work within assigned clients).
export const POST = withHireAuth(async (req, ctx) => {
  if (!can(ctx.role, 'manageClients')) {
    console.warn('[hire/crm/clients] create denied — role=%s (needs manageClients)', ctx.role)
    return NextResponse.json({ error: `Your role (${ctx.role}) can't create clients — an Admin or Manager can.` }, { status: 403 })
  }
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
