import { withInterviewsApiKeyAuth, ok, fail } from '@/lib/interviews/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/interviews/:id
 * Interview status (invited | in_progress | completed) + scores when ready.
 * Scoped to the API key's agency via the interview's Position.
 */
export const GET = withInterviewsApiKeyAuth(async (_req, ctx, params) => {
  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    include: { position: { select: { agencyId: true } }, candidate: { select: { id: true, score: true, recommendation: true } } },
  })
  if (!interview || interview.position.agencyId !== ctx.agencyId) return fail(404, 'Interview not found')

  const status =
    interview.status === 'completed' || interview.completedAt ? 'completed'
    : interview.startedAt || interview.status === 'in_progress' ? 'in_progress'
    : 'invited'

  return ok({
    interviewId: interview.id,
    candidateId: interview.candidateId,
    status,
    overallScore: status === 'completed' ? (interview.candidate?.score ?? null) : null,
    recommendation: status === 'completed' ? (interview.candidate?.recommendation ?? null) : null,
    reportReady: status === 'completed' && interview.candidate?.score != null,
    startedAt: interview.startedAt,
    completedAt: interview.completedAt,
  })
})
