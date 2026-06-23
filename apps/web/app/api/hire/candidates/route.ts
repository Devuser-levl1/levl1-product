import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'
import { writeAudit } from '@/lib/hire/audit'

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

  // The candidate's score is JOB-RELATIVE — read it from the canonical HireMatch
  // row for their currently-attached job (the same row the job's Top Matches
  // shows). No separate recompute; '—' when not attached to a job.
  const attached = candidates.filter((c) => c.jobId)
  const matchRows = attached.length
    ? await prisma.hireMatch.findMany({
        where: { tenantId: ctx.tenantId, OR: attached.map((c) => ({ jobId: c.jobId as string, candidateId: c.id })) },
        select: { jobId: true, candidateId: true, score: true, verdict: true },
      })
    : []
  const matchByCand = new Map(matchRows.map((m) => [`${m.jobId}|${m.candidateId}`, m]))
  const withMatch = candidates.map((c) => {
    const m = c.jobId ? matchByCand.get(`${c.jobId}|${c.id}`) : undefined
    return { ...c, match: m ? { score: m.score, verdict: m.verdict, jobTitle: c.job?.title ?? null } : null }
  })

  return NextResponse.json({ candidates: withMatch, total, page, limit })
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  // A sourced candidate may not have an email yet — name is the only requirement.
  if (!body.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const allow = await checkAllowance(ctx.tenantId, 'candidate')
  if (!allow.allowed) return NextResponse.json({ error: allow.reason, message: allow.message, upgrade: true }, { status: 402 })

  const email = body.email ? String(body.email).toLowerCase() : null
  const skills = Array.isArray(body.skills) && body.skills.length ? (body.skills as Prisma.InputJsonValue) : undefined

  const candidate = await prisma.hireCandidate.create({
    data: {
      tenantId: ctx.tenantId,
      jobId: body.jobId || null,
      name: String(body.name),
      email,
      phone: body.phone || null,
      currentTitle: body.currentTitle || body.currentRole || null,
      currentCompany: body.currentCompany || null,
      linkedinUrl: body.linkedinUrl || body.linkedIn || null,
      totalYears: typeof body.totalYears === 'number' ? body.totalYears : null,
      ...(skills !== undefined ? { skills } : {}),
      resumeText: body.resumeText || null,
      source: body.source || 'Manual',
      currentStage: body.stage || 'Sourced',
    },
  })

  // WITH a job → score; WITHOUT → baseline summary so the candidate isn't blank.
  if (body.resumeText) {
    const { enqueue } = await import('@/lib/hire/jobs/queue')
    const job = body.jobId ? 'hire-score-candidate' : 'hire-baseline-summary'
    await enqueue(job, { candidateId: candidate.id }).catch((e) => console.error('[hire/candidates] enqueue failed:', e))
  }

  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'note', note: `Candidate added via ${body.source || 'manual entry'}`, userId: ctx.userId },
  })
  if (!email) {
    await prisma.hireCandidateActivity.create({
      data: { candidateId: candidate.id, type: 'note', note: 'Needs review — email not detected, please add', userId: ctx.userId },
    })
  }
  await incrementUsage(ctx.tenantId, 'candidate')

  await writeAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'candidate_create',
    candidateId: candidate.id, candidateName: candidate.name, jobId: candidate.jobId,
    reason: `Added via ${body.source || 'manual entry'}`,
  })

  return NextResponse.json(candidate, { status: 201 })
})
