import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { approveProposal } from '@/lib/hire/agent/approvals'
import '@/lib/hire/agent' // side-effect: registers every agent executor

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/hire/agent/proposals/[id]/approve  { chosenOption }
// Approves the proposal and runs its tool chain (the ONLY place consequential
// tools execute). Attributed to 'Levl1 Agent (approved by <user>)'.
export const POST = withHireAuth(async (req, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const me = await prisma.hireUser.findUnique({ where: { id: ctx.userId }, select: { name: true, email: true } })
  const approvedByName = me?.name || me?.email || 'a teammate'

  const res = await approveProposal(ctx.tenantId, params.id, { userId: ctx.userId, role: ctx.role, approvedByName }, body.chosenOption)
  if (!res.ok) return NextResponse.json({ error: res.error ?? 'Could not approve', status: res.status }, { status: res.status === 'not_found' ? 404 : 400 })
  return NextResponse.json(res)
})
