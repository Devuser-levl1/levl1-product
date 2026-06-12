import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx) => {
  const clients = await prisma.hireClient.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(clients)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
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
