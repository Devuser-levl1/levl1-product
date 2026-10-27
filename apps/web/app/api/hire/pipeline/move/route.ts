import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { maybeAutoEmail } from '@/lib/hire/auto-email'
import { writeAudit, REJECTED_STAGE } from '@/lib/hire/audit'
import { canAccessCandidate } from '@/lib/hire/scope'
import { isTerminalStage, logAttribution } from '@/lib/hire/candidate-ownership'

export const dynamic = 'force-dynamic'

export const PATCH = withHireAuth(async (req, ctx) => {
  const { candidateId, toStage } = await req.json()
  if (!candidateId || !toStage) return NextResponse.json({ error: 'candidateId and toStage required' }, { status: 400 })

  // Rejecting requires a reason — route those through /api/hire/pipeline/reject.
  if (toStage === REJECTED_STAGE) {
    return NextResponse.json({ error: 'Use the reject endpoint (a reason is required)' }, { status: 400 })
  }

  const candidate = await prisma.hireCandidate.findFirst({ where: { id: candidateId, tenantId: ctx.tenantId }, include: { job: { select: { clientId: true } } } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await canAccessCandidate(ctx, candidate))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fromStage = candidate.currentStage
  if (fromStage === toStage) return NextResponse.json({ success: true, fromStage, toStage })

  // Moving out of Rejected re-activates the candidate — clear the rejection snapshot.
  const clearRejection = fromStage === REJECTED_STAGE
  const isPlacement = /^(hired|placed)$/i.test(String(toStage).trim())
  const terminal = isTerminalStage(String(toStage))
  const releasing = terminal && !!candidate.ownerRecruiterId
  await prisma.hireCandidate.update({
    where: { id: candidateId },
    data: {
      currentStage: toStage,
      ...(clearRejection ? { rejectedReason: null, rejectedAt: null, rejectedBy: null } : {}),
      ...(isPlacement ? { placedByUserId: ctx.userId, placedAt: candidate.placedAt ?? new Date() } : {}),
      ...(releasing ? { ownerRecruiterId: null, claimedAt: null, claimedBy: null } : {}),
    },
  })
  await prisma.hireCandidateActivity.create({
    data: { candidateId, type: 'stage_change', fromStage, toStage, userId: ctx.userId, note: `Moved from ${fromStage} to ${toStage}` },
  })
  await writeAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'stage_move',
    candidateId, candidateName: candidate.name, jobId: candidate.jobId, fromStage, toStage,
  })
  // Attribution timeline: placement (sets placedBy above), terminal release, or advance.
  await logAttribution(prisma, {
    tenantId: ctx.tenantId, candidateId, jobId: candidate.jobId, actorUserId: ctx.userId,
    eventType: isPlacement ? 'placed' : (terminal ? 'owner_released' : 'advanced'),
    fromUserId: releasing ? candidate.ownerRecruiterId : null,
    note: `${fromStage} → ${toStage}`,
  })
  await maybeAutoEmail(candidateId, toStage)

  return NextResponse.json({ success: true, fromStage, toStage })
})
