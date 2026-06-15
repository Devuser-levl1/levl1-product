import { withApiKeyAuth, ok } from '@/lib/api/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/jobs
 * List the tenant's Hire jobs (for callers that use Hire jobs rather than
 * inline JDs). Returns: { data: [{ id, title, status, location, createdAt }] }.
 */
export const GET = withApiKeyAuth(async (_req, ctx) => {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, title: true, status: true, location: true, department: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok(jobs)
})
