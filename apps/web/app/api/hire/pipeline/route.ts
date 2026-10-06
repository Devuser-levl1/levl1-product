import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { REJECTED_STAGE } from '@/lib/hire/audit'
import { getScopes } from '@/lib/hire/scope'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (req, ctx) => {
  const jobId = new URL(req.url).searchParams.get('jobId')

  // Pipeline is per-job; recruiters only see their assigned clients' jobs.
  const { job: jobWhere } = await getScopes(ctx)
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE', ...jobWhere, ...(jobId ? { id: jobId } : {}) },
    include: {
      candidates: {
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true, name: true, email: true, phone: true, currentStage: true,
          aiScore: true, aiRecommendation: true, aiSummary: true, interviewScore: true, source: true, createdAt: true,
          rejectedReason: true, rejectedAt: true, rejectedBy: true,
          ownerRecruiterId: true, claimedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Resolve owner (who's pursuing) display names in one query, then stamp each
  // card with { owner } so the pipeline shows ownership at a glance.
  const ownerIds = Array.from(new Set(jobs.flatMap((j) => j.candidates.map((c) => c.ownerRecruiterId).filter(Boolean) as string[])))
  const ownerUsers = ownerIds.length ? await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, id: { in: ownerIds } }, select: { id: true, name: true } }) : []
  const ownerName = (id: string | null) => (id ? ownerUsers.find((u) => u.id === id)?.name ?? null : null)
  const withOwner = (c: (typeof jobs)[number]['candidates'][number]) => ({ ...c, owner: c.ownerRecruiterId ? { id: c.ownerRecruiterId, name: ownerName(c.ownerRecruiterId) } : null })

  const pipeline = jobs.map((job) => {
    const stages = Array.isArray(job.stages) ? (job.stages as string[]) : []
    // Active stages from the job definition, then ALWAYS a trailing Rejected
    // swimlane (rejected candidates aren't in the job's own stage list).
    const named = stages.filter((s) => s !== REJECTED_STAGE)
    const stageCols = named.map((stage) => ({ name: stage, candidates: job.candidates.filter((c) => c.currentStage === stage).map(withOwner) }))
    const rejected = job.candidates.filter((c) => c.currentStage === REJECTED_STAGE).map(withOwner)
    stageCols.push({ name: REJECTED_STAGE, candidates: rejected })
    return {
      id: job.id,
      title: job.title,
      stages: stageCols,
      totalCandidates: job.candidates.length,
    }
  })
  return NextResponse.json(pipeline)
})
