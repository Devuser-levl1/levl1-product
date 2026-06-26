import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { canAccessClient } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  if (!(await canAccessClient(ctx, params.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const client = await prisma.hireClient.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { contacts: true },
  })
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(client)
})
