import { withApiKeyAuth, ok, fail } from '@/lib/api/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/candidates/:id
 * Fetch a candidate by id (tenant-scoped). Returns: { data: candidate }.
 */
export const GET = withApiKeyAuth(async (_req, ctx, params) => {
  const c = await prisma.hireCandidate.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    select: {
      id: true, name: true, email: true, phone: true, currentTitle: true, currentCompany: true,
      resumeUrl: true, source: true, currentStage: true, aiScore: true, interviewScore: true, createdAt: true,
    },
  })
  if (!c) return fail(404, 'Candidate not found')
  return ok(c)
})
