import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/hire/agent/proposals?status=pending — this tenant's agent proposals.
export const GET = withHireAuth(async (req, ctx) => {
  const status = new URL(req.url).searchParams.get('status') ?? 'pending'
  const proposals = await prisma.hireAgentProposal.findMany({
    where: { tenantId: ctx.tenantId, ...(status === 'all' ? {} : { status }) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, type: true, agent: true, status: true, title: true, summary: true, options: true, payload: true, sourceType: true, sourceId: true, createdAt: true, result: true, error: true },
  })
  return NextResponse.json({ proposals })
})
