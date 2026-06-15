import { withApiKeyAuth, ok, fail } from '@/lib/api/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/interviews/:id
 * Interview status (invited | in_progress | completed) plus scores when ready.
 * Tenant-scoped: the interview must belong to one of the caller's candidates.
 */
export const GET = withApiKeyAuth(async (_req, ctx, params) => {
  const link = await prisma.hireInterviewLink.findFirst({
    where: { interviewSessionId: params.id, hireCandidate: { tenantId: ctx.tenantId } },
    include: { hireCandidate: { select: { id: true } } },
  })
  if (!link) return fail(404, 'Interview not found')

  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    include: { candidate: { select: { score: true, recommendation: true } } },
  })
  if (!interview) return fail(404, 'Interview not found')

  const status =
    interview.status === 'completed' || interview.completedAt ? 'completed'
    : interview.startedAt || interview.status === 'in_progress' ? 'in_progress'
    : 'invited'

  return ok({
    interviewId: interview.id,
    candidateId: link.hireCandidateId,
    status,
    overallScore: status === 'completed' ? (link.overallScore ?? interview.candidate?.score ?? null) : null,
    recommendation: status === 'completed' ? (link.recommendation ?? interview.candidate?.recommendation ?? null) : null,
    reportReady: status === 'completed' && link.overallScore != null,
    startedAt: interview.startedAt,
    completedAt: interview.completedAt,
  })
})
