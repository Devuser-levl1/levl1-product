import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { ensureInterviewPosition, generateQuestionSet } from '@/lib/hire/interviews-bridge'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST — generate an interview question set from the job's EXISTING JD (no
// JD re-upload, no re-parse) and surface it for human REVIEW. Sets the mapped
// Position to 'pending_approval'. Does NOT set techLeadApproved / hrApproved —
// a human must approve via the approve route before any interview can run.
export const POST = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const positionId = await ensureInterviewPosition(job.id, ctx.tenantId)

  // Reuse the job's description already on file — no re-upload / re-parse.
  const qs = await generateQuestionSet(job.title, job.description)
  await prisma.questionSet.upsert({ where: { positionId }, update: qs, create: { positionId, ...qs } })
  await prisma.position.update({
    where: { id: positionId },
    // Move to review state. Explicitly clear any prior approval so a re-generate
    // re-opens the human gate.
    data: { status: 'pending_approval', techLeadApproved: false, hrApproved: false },
  })

  const questionSet = await prisma.questionSet.findUnique({ where: { positionId } })
  console.log('[interview-questions/generate] job=%s position=%s → pending_approval', job.id, positionId)
  return NextResponse.json({ positionId, status: 'pending_approval', questionSet })
})
