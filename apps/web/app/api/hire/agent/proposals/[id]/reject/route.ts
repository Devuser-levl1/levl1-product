import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { rejectProposal } from '@/lib/hire/agent/approvals'

export const dynamic = 'force-dynamic'

// POST /api/hire/agent/proposals/[id]/reject — dismiss; nothing executes.
export const POST = withHireAuth(async (_req, ctx, params) => {
  const res = await rejectProposal(ctx.tenantId, params.id, ctx.userId)
  if (!res.ok) return NextResponse.json({ error: `Proposal is ${res.status}`, status: res.status }, { status: res.status === 'not_found' ? 404 : 400 })
  return NextResponse.json(res)
})
