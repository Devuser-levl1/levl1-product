import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { writeAudit, REJECTED_STAGE } from '@/lib/hire/audit'

export const dynamic = 'force-dynamic'

// Move a candidate into the Rejected swimlane. A reason is REQUIRED. Records the
// reason + actor on the candidate (for the swimlane) and in the audit log.
export const PATCH = withHireAuth(async (req, ctx) => {
  const { candidateId, reason } = await req.json().catch(() => ({}))
  if (!candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })
  const trimmed = typeof reason === 'string' ? reason.trim() : ''
  if (!trimmed) return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })

  const candidate = await prisma.hireCandidate.findFirst({ where: { id: candidateId, tenantId: ctx.tenantId } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fromStage = candidate.currentStage
  const actorName = await writeAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'reject',
    candidateId: candidate.id, candidateName: candidate.name, jobId: candidate.jobId,
    fromStage, toStage: REJECTED_STAGE, reason: trimmed,
  })

  await prisma.hireCandidate.update({
    where: { id: candidate.id },
    data: { currentStage: REJECTED_STAGE, rejectedReason: trimmed, rejectedAt: new Date(), rejectedBy: actorName },
  })
  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'reject', fromStage, toStage: REJECTED_STAGE, userId: ctx.userId, note: `Rejected: ${trimmed}` },
  })

  return NextResponse.json({ success: true, rejectedBy: actorName })
})
