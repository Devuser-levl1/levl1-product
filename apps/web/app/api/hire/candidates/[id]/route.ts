import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { activities: { orderBy: { createdAt: 'desc' } } },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(candidate)
})
