import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { isTerminalStage } from '@/lib/hire/candidate-ownership'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (req, ctx, params) => {
  const { toStage } = await req.json()
  if (!toStage) return NextResponse.json({ error: 'toStage required' }, { status: 400 })

  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A terminal decision (hired/rejected/withdrawn) releases the per-job claim.
  const releasing = isTerminalStage(String(toStage)) && !!candidate.ownerRecruiterId
  const updated = await prisma.hireCandidate.update({
    where: { id: candidate.id },
    data: { currentStage: String(toStage), ...(releasing ? { ownerRecruiterId: null, claimedAt: null, claimedBy: null } : {}) },
  })
  await prisma.hireCandidateActivity.create({
    data: {
      candidateId: candidate.id,
      type: 'stage_change',
      fromStage: candidate.currentStage,
      toStage: String(toStage),
      userId: ctx.userId,
    },
  })
  return NextResponse.json(updated)
})
