import { withInterviewsApiKeyAuth, ok, fail } from '@/lib/interviews/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/candidates/:id
 * Fetch a candidate by id (scoped to the API key's agency via its Position).
 */
export const GET = withInterviewsApiKeyAuth(async (_req, ctx, params) => {
  const c = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { position: { select: { agencyId: true } } },
  })
  if (!c || c.position.agencyId !== ctx.agencyId) return fail(404, 'Candidate not found')
  return ok({
    id: c.id, name: c.name, email: c.email, phone: c.phone,
    currentTitle: c.currentTitle, currentCompany: c.currentCompany,
    status: c.status, score: c.score, recommendation: c.recommendation, createdAt: c.uploadedAt,
  })
})
