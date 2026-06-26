import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { canAccessClient, requireCap } from '@/lib/hire/scope'
import { can } from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  // Recruiters may only open a client they're assigned to (no direct-URL access to others).
  if (!(await canAccessClient(ctx, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const showDeals = can(ctx.role, 'deals')
  const client = await prisma.hireClient.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: {
      contacts: { include: { activities: { orderBy: { createdAt: 'desc' }, take: 20 } }, orderBy: { createdAt: 'asc' } },
      ...(showDeals ? { deals: { orderBy: { createdAt: 'desc' as const } } } : {}),
      jobs: { include: { _count: { select: { candidates: true } } }, orderBy: { createdAt: 'desc' } },
      recruiters: { select: { id: true, name: true, email: true } },
    },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
})

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const denied = requireCap(ctx, 'assignClients'); if (denied) return denied
  const existing = await prisma.hireClient.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const client = await prisma.hireClient.update({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      industry: body.industry ?? existing.industry,
      website: body.website ?? existing.website,
      logoUrl: body.logoUrl ?? existing.logoUrl,
    },
  })
  return NextResponse.json(client)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const denied = requireCap(ctx, 'crm'); if (denied) return denied
  const existing = await prisma.hireClient.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activeJobs = await prisma.hireJob.count({ where: { clientId: params.id, status: 'ACTIVE' } })
  if (activeJobs > 0) {
    return NextResponse.json({ error: `Cannot delete client with ${activeJobs} active job(s). Close jobs first.` }, { status: 409 })
  }
  // Detach remaining (non-active) jobs, delete deals + contacts (+ their activities), then client.
  await prisma.hireJob.updateMany({ where: { clientId: params.id }, data: { clientId: null } })
  const contacts = await prisma.hireContact.findMany({ where: { clientId: params.id }, select: { id: true } })
  for (const c of contacts) await prisma.hireContactActivity.deleteMany({ where: { contactId: c.id } })
  await prisma.hireContact.deleteMany({ where: { clientId: params.id } })
  await prisma.hireDeal.deleteMany({ where: { clientId: params.id } })
  await prisma.hireClient.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
})
