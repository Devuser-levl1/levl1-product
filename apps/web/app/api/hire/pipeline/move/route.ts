import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { maybeAutoEmail } from '@/lib/hire/auto-email'

export const dynamic = 'force-dynamic'

export const PATCH = withHireAuth(async (req, ctx) => {
  const { candidateId, toStage } = await req.json()
  if (!candidateId || !toStage) return NextResponse.json({ error: 'candidateId and toStage required' }, { status: 400 })

  const candidate = await prisma.hireCandidate.findFirst({ where: { id: candidateId, tenantId: ctx.tenantId } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fromStage = candidate.currentStage
  if (fromStage === toStage) return NextResponse.json({ success: true, fromStage, toStage })

  await prisma.hireCandidate.update({ where: { id: candidateId }, data: { currentStage: toStage } })
  await prisma.hireCandidateActivity.create({
    data: { candidateId, type: 'stage_change', fromStage, toStage, userId: ctx.userId, note: `Moved from ${fromStage} to ${toStage}` },
  })
  await maybeAutoEmail(candidateId, toStage)

  return NextResponse.json({ success: true, fromStage, toStage })
})
