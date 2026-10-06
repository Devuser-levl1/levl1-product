import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'
import { writeAudit, logAudit, resolveActorName } from '@/lib/hire/audit'
import { getScopes } from '@/lib/hire/scope'
import { addCandidateToJob } from '@/lib/hire/candidate-ownership'

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
    // Search name / email / title / company (substring, case-insensitive).
    // Scope is AND-wrapped below, so this never widens what the recruiter is
    // allowed to see. (Skill search is offered in Talent Pool, which parses the
    // JSON skills client-side over its already-scoped rows.)
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { currentTitle: { contains: search, mode: 'insensitive' } },
      { currentCompany: { contains: search, mode: 'insensitive' } },
    ]
  }
  // Recruiters see candidates assigned to them, candidates whose job belongs to
  // their assigned clients, or unassigned/job-less ones; managers/admins all.
  // AND-wrapped so it composes with the search OR above.
  const { candidate: candidateWhere } = await getScopes(ctx)
  where.AND = [candidateWhere as Prisma.HireCandidateWhereInput]

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
  // Resolve owner (who's pursuing) names for the list in one query.
  const ownerIds = Array.from(new Set(candidates.map((c) => c.ownerRecruiterId).filter(Boolean) as string[]))
  const ownerUsers = ownerIds.length ? await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, id: { in: ownerIds } }, select: { id: true, name: true } }) : []
  const withMatch = candidates.map((c) => {
    const m = c.jobId ? matchByCand.get(`${c.jobId}|${c.id}`) : undefined
    const owner = c.ownerRecruiterId ? { id: c.ownerRecruiterId, name: ownerUsers.find((u) => u.id === c.ownerRecruiterId)?.name ?? null } : null
    return { ...c, owner, match: m ? { score: m.score, verdict: m.verdict, jobTitle: c.job?.title ?? null } : null }
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
  const jobId = body.jobId || null
  const actorName = await resolveActorName(ctx.userId)

  // Funnel through the shared dedupe+ownership helper so a candidate can't be
  // added to the same job twice, and the first recruiter becomes the owner.
  const result = await addCandidateToJob({
    tenantId: ctx.tenantId, jobId, actorUserId: ctx.userId, claimerName: actorName,
    data: {
      name: String(body.name), email, phone: body.phone || null,
      currentTitle: body.currentTitle || body.currentRole || null,
      currentCompany: body.currentCompany || null,
      linkedinUrl: body.linkedinUrl || body.linkedIn || null,
      totalYears: typeof body.totalYears === 'number' ? body.totalYears : null,
      ...(skills !== undefined ? { skills } : {}),
      resumeText: body.resumeText || null,
      source: body.source || 'Manual',
      currentStage: body.stage || 'Sourced',
      assigneeId: ctx.userId,
    },
  })

  // Already on this job → no duplicate. Surface the existing record + its owner.
  // The soft lock is advisory: with override:true the recruiter proceeds anyway
  // (logged); without it, they see the warning and back off. No new row either way.
  if (!result.created) {
    const since = result.candidate.claimedAt ? new Date(result.candidate.claimedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : null
    const ownerName = result.owner?.name ?? 'another recruiter'
    if (body.override === true) {
      await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'candidate_claim_override', targetType: 'candidate', targetId: result.candidate.id, targetName: result.candidate.name, reason: `Proceeded despite ${ownerName}'s claim`, meta: { owner: result.owner?.id, jobId } })
      return NextResponse.json({ candidate: result.candidate, duplicate: true, overridden: true, owner: result.owner }, { status: 200 })
    }
    return NextResponse.json({
      candidate: result.candidate, duplicate: true, raced: result.raced, owner: result.owner,
      message: `${result.candidate.name} is already being pursued for this job by ${ownerName}${since ? ` since ${since}` : ''}.`,
    }, { status: 200 })
  }

  const candidate = result.candidate

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
