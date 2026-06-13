import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: {
      candidates: { select: { id: true, name: true, email: true, currentStage: true, aiScore: true, aiRecommendation: true, createdAt: true } },
      client: true,
    },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
})

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string') data.title = body.title
  if (typeof body.description === 'string') data.description = body.description
  if ('department' in body) data.department = body.department ?? null
  if ('location' in body) data.location = body.location ?? null
  if ('salaryMin' in body) data.salaryMin = body.salaryMin != null ? Number(body.salaryMin) : null
  if ('salaryMax' in body) data.salaryMax = body.salaryMax != null ? Number(body.salaryMax) : null
  if ('clientId' in body) data.clientId = body.clientId || null
  if (['ACTIVE', 'PAUSED', 'CLOSED'].includes(body.status)) data.status = body.status
  if (typeof body.aiAutoAdvance === 'boolean') data.aiAutoAdvance = body.aiAutoAdvance
  if (body.aiAutoAdvanceThreshold != null) data.aiAutoAdvanceThreshold = Number(body.aiAutoAdvanceThreshold)
  if ('aiAutoAdvanceStage' in body) data.aiAutoAdvanceStage = body.aiAutoAdvanceStage || null
  if ('autoEmailStage' in body) data.autoEmailStage = body.autoEmailStage || null
  if ('autoEmailSubject' in body) data.autoEmailSubject = body.autoEmailSubject || null
  if ('autoEmailBody' in body) data.autoEmailBody = body.autoEmailBody || null

  if (Array.isArray(body.stages)) {
    if (body.stages.length < 2) {
      return NextResponse.json({ error: 'A pipeline needs at least 2 stages' }, { status: 400 })
    }
    // Reject if any candidate sits in a stage being removed.
    const candidates = await prisma.hireCandidate.findMany({
      where: { jobId: existing.id, tenantId: ctx.tenantId },
      select: { currentStage: true },
    })
    const removed = candidates.map((c) => c.currentStage).filter((s) => !body.stages.includes(s))
    if (removed.length > 0) {
      return NextResponse.json({ error: `Cannot remove stages with candidates in them: ${Array.from(new Set(removed)).join(', ')}` }, { status: 400 })
    }
    data.stages = body.stages
  }

  const job = await prisma.hireJob.update({ where: { id: existing.id }, data })
  return NextResponse.json(job)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Detach candidates, then delete the job.
  await prisma.hireCandidate.updateMany({ where: { jobId: existing.id }, data: { jobId: null } })
  await prisma.hireJob.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
})
