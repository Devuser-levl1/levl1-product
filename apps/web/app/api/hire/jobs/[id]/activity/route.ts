import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — recent activity across all candidates attached to this job (job detail
// Activity tab, P0-4). Tenant-scoped via the job.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const activities = await prisma.hireCandidateActivity.findMany({
    where: { candidate: { jobId: job.id, tenantId: ctx.tenantId } },
    orderBy: { createdAt: 'desc' }, take: 60,
    select: { id: true, type: true, note: true, fromStage: true, toStage: true, createdAt: true, candidate: { select: { id: true, name: true } } },
  })

  const items = activities.map((a) => ({
    id: a.id, type: a.type, note: a.note, fromStage: a.fromStage, toStage: a.toStage, createdAt: a.createdAt,
    candidateId: a.candidate.id, candidateName: a.candidate.name,
  }))
  return NextResponse.json({ items })
})
