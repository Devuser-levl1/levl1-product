import { withInterviewsApiKeyAuth, ok } from '@/lib/interviews/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/jobs
 * List the agency's Interviews positions (for callers that trigger against an
 * existing position rather than an inline JD). ATS-agnostic — no Hire jobs.
 * Returns: { data: [{ id, title, status, createdAt }] }.
 */
export const GET = withInterviewsApiKeyAuth(async (_req, ctx) => {
  const positions = await prisma.position.findMany({
    where: { agencyId: ctx.agencyId, title: { not: '__api_intake__' } },
    select: { id: true, title: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok(positions)
})
