import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const candidate = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { job: true, activities: { orderBy: { createdAt: 'desc' }, take: 50 } },
  })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(candidate)
})

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  if (body.currentStage && body.currentStage !== existing.currentStage) {
    await prisma.hireCandidateActivity.create({
      data: { candidateId: existing.id, type: 'stage_change', fromStage: existing.currentStage, toStage: body.currentStage, userId: ctx.userId },
    })
  }

  // Attaching a previously-jobless candidate to a job → trigger JD scoring.
  const attachingToJob = body.jobId !== undefined && body.jobId && body.jobId !== existing.jobId

  const candidate = await prisma.hireCandidate.update({
    where: { id: existing.id },
    data: {
      name: body.name ?? existing.name,
      email: body.email ? String(body.email).toLowerCase() : existing.email,
      phone: body.phone ?? existing.phone,
      currentTitle: body.currentTitle ?? existing.currentTitle,
      currentCompany: body.currentCompany ?? existing.currentCompany,
      linkedinUrl: body.linkedinUrl ?? existing.linkedinUrl,
      currentStage: body.currentStage ?? existing.currentStage,
      source: body.source ?? existing.source,
      ...(body.jobId !== undefined ? { jobId: body.jobId || null } : {}),
    },
  })

  // Score now that there's a JD to score against (deferred from a jobless import).
  if (attachingToJob && candidate.resumeText) {
    const { enqueue } = await import('@/lib/hire/jobs/queue')
    await enqueue('hire-score-candidate', { candidateId: candidate.id }).catch((e) => console.error('[hire/candidates] enqueue on attach failed:', e))
  }

  return NextResponse.json(candidate)
})

export const DELETE = withHireAuth(async (req, ctx, params) => {
  const candidate = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let reason = ''
  try { const b = await req.json(); reason = b?.reason ?? '' } catch { /* no body */ }

  await prisma.hireCandidateActivity.deleteMany({ where: { candidateId: candidate.id } })
  await prisma.hireInterview.deleteMany({ where: { candidateId: candidate.id } })
  await prisma.hireCandidate.delete({ where: { id: candidate.id } })

  console.log(`[hire] Candidate deleted: ${candidate.name} by user ${ctx.userId}. Reason: ${reason}`)
  return NextResponse.json({ success: true })
})
