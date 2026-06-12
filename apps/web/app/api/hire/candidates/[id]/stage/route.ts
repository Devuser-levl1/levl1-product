import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const POST = withHireAuth(async (req, ctx, params) => {
  const { toStage } = await req.json()
  if (!toStage) return NextResponse.json({ error: 'toStage required' }, { status: 400 })

  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.hireCandidate.update({
    where: { id: candidate.id },
    data: { currentStage: String(toStage) },
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
