import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — where this job is posted (per board), so status persists on return.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const postings = await prisma.boardPosting.findMany({
    where: { jobId: job.id, tenantId: ctx.tenantId },
    select: { provider: true, status: true, postingUrl: true, externalRefId: true, errorMsg: true, postedAt: true, lastSyncedAt: true },
  })
  return NextResponse.json({ postings })
})
