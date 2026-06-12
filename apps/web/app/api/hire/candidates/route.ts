import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  const stage = searchParams.get('stage')
  const search = searchParams.get('search')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')))

  const where: Prisma.HireCandidateWhereInput = { tenantId: ctx.tenantId }
  if (jobId) where.jobId = jobId
  if (stage) where.currentStage = stage
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [candidates, total] = await Promise.all([
    prisma.hireCandidate.findMany({
      where,
      include: {
        job: { select: { id: true, title: true } },
        _count: { select: { activities: true } },
      },
      orderBy: [{ aiScore: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.hireCandidate.count({ where }),
  ])

  return NextResponse.json({ candidates, total, page, limit })
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  if (!body.name || !body.email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const candidate = await prisma.hireCandidate.create({
    data: {
      tenantId: ctx.tenantId,
      jobId: body.jobId || null,
      name: String(body.name),
      email: String(body.email).toLowerCase(),
      phone: body.phone || null,
      currentTitle: body.currentTitle || body.currentRole || null,
      currentCompany: body.currentCompany || null,
      linkedinUrl: body.linkedinUrl || null,
      resumeText: body.resumeText || null,
      source: body.source || 'Manual',
      currentStage: body.stage || 'Sourced',
    },
  })

  if (body.resumeText && body.jobId) {
    const { enqueue } = await import('@/lib/hire/jobs/queue')
    await enqueue('hire:score-candidate', { candidateId: candidate.id }).catch((e) => console.error('[hire/candidates] enqueue failed:', e))
  }

  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'note', note: `Candidate added via ${body.source || 'manual entry'}`, userId: ctx.userId },
  })

  return NextResponse.json(candidate, { status: 201 })
})
