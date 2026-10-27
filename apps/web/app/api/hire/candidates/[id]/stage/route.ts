import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { isTerminalStage, logAttribution } from '@/lib/hire/candidate-ownership'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (req, ctx, params) => {
  const { toStage } = await req.json()
  if (!toStage) return NextResponse.json({ error: 'toStage required' }, { status: 400 })

  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A terminal decision (hired/rejected/withdrawn) releases the per-job claim.
  const stage = String(toStage)
  const terminal = isTerminalStage(stage)
  const isPlacement = /^(hired|placed)$/i.test(stage.trim())
  const releasing = terminal && !!candidate.ownerRecruiterId
  const updated = await prisma.hireCandidate.update({
    where: { id: candidate.id },
    data: {
      currentStage: stage,
      ...(isPlacement ? { placedByUserId: ctx.userId, placedAt: candidate.placedAt ?? new Date() } : {}),
      ...(releasing ? { ownerRecruiterId: null, claimedAt: null, claimedBy: null } : {}),
    },
  })
  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'stage_change', fromStage: candidate.currentStage, toStage: stage, userId: ctx.userId },
  })
  // Attribution event: placement, terminal-release, or a normal advance.
  await logAttribution(prisma, {
    tenantId: ctx.tenantId, candidateId: candidate.id, jobId: candidate.jobId, actorUserId: ctx.userId,
    eventType: isPlacement ? 'placed' : (terminal ? 'owner_released' : 'advanced'),
    fromUserId: releasing ? candidate.ownerRecruiterId : null,
    note: `${candidate.currentStage} → ${stage}`,
  })
  return NextResponse.json(updated)
})
