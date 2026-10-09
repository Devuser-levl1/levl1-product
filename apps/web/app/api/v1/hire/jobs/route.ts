import { withApiKeyAuth, ok } from '@/lib/api/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/hire/jobs — list the tenant's active Hire jobs for the browser
 * extension (validate the lvl1_ key + populate the "default job" dropdown).
 * Hire-auth (lvl1_ key → tenantId), consistent with /api/v1/hire/capture.
 * Returns: { data: [{ id, title, status }] }.
 */
export const GET = withApiKeyAuth(async (_req, ctx) => {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok(jobs)
})
