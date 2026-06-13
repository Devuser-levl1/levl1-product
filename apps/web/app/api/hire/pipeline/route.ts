import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (req, ctx) => {
  const jobId = new URL(req.url).searchParams.get('jobId')

  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE', ...(jobId ? { id: jobId } : {}) },
    include: {
      candidates: {
        orderBy: [{ aiScore: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true, name: true, email: true, phone: true, currentStage: true,
          aiScore: true, aiRecommendation: true, aiSummary: true, interviewScore: true, source: true, createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const pipeline = jobs.map((job) => {
    const stages = Array.isArray(job.stages) ? (job.stages as string[]) : []
    return {
      id: job.id,
      title: job.title,
      stages: stages.map((stage) => ({ name: stage, candidates: job.candidates.filter((c) => c.currentStage === stage) })),
      totalCandidates: job.candidates.length,
    }
  })
  return NextResponse.json(pipeline)
})
