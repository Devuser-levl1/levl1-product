import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { REJECTED_STAGE } from '@/lib/hire/audit'
import { assigneeScope } from '@/lib/hire/roles'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (req, ctx) => {
  const jobId = new URL(req.url).searchParams.get('jobId')

  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE', ...assigneeScope(ctx.role, ctx.userId), ...(jobId ? { id: jobId } : {}) },
    include: {
      candidates: {
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true, name: true, email: true, phone: true, currentStage: true,
          aiScore: true, aiRecommendation: true, aiSummary: true, interviewScore: true, source: true, createdAt: true,
          rejectedReason: true, rejectedAt: true, rejectedBy: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const pipeline = jobs.map((job) => {
    const stages = Array.isArray(job.stages) ? (job.stages as string[]) : []
    // Active stages from the job definition, then ALWAYS a trailing Rejected
    // swimlane (rejected candidates aren't in the job's own stage list).
    const named = stages.filter((s) => s !== REJECTED_STAGE)
    const stageCols = named.map((stage) => ({ name: stage, candidates: job.candidates.filter((c) => c.currentStage === stage) }))
    const rejected = job.candidates.filter((c) => c.currentStage === REJECTED_STAGE)
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
