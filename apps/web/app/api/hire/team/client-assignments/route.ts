import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { requireCap } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

// Client → recruiter assignment board. Manager/Admin only (assignClients).

// GET — every client with its assigned recruiters + the assignable team members.
export const GET = withHireAuth(async (_req, ctx) => {
  const denied = requireCap(ctx, 'assignClients'); if (denied) return denied
  const [clients, members] = await Promise.all([
    prisma.hireClient.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true, recruiters: { select: { id: true, name: true, email: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.hireUser.findMany({
      where: { tenantId: ctx.tenantId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ])
  return NextResponse.json({ clients, members })
})

// PUT — set the full recruiter list for a client (replaces existing assignments).
export const PUT = withHireAuth(async (req, ctx) => {
  const denied = requireCap(ctx, 'assignClients'); if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const clientId = String(body.clientId ?? '')
  const recruiterIds: string[] = Array.isArray(body.recruiterIds) ? body.recruiterIds.map(String) : []

  const client = await prisma.hireClient.findFirst({ where: { id: clientId, tenantId: ctx.tenantId }, select: { id: true } })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Only allow assigning users that belong to this tenant.
  const valid = await prisma.hireUser.findMany({ where: { id: { in: recruiterIds }, tenantId: ctx.tenantId }, select: { id: true } })

  const updated = await prisma.hireClient.update({
    where: { id: client.id },
    data: { recruiters: { set: valid.map((u) => ({ id: u.id })) } },
    select: { id: true, recruiters: { select: { id: true, name: true, email: true } } },
  })
  return NextResponse.json(updated)
})
