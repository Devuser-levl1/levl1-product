import { withInterviewsApiKeyAuth, ok, fail } from '@/lib/interviews/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/interviews/:id/report
 * Full structured report JSON. 404 until the interview is completed and the
 * report generated. Scoped to the API key's agency via the interview's Position.
 */
export const GET = withInterviewsApiKeyAuth(async (_req, ctx, params) => {
  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    include: { position: { select: { agencyId: true } } },
  })
  if (!interview || interview.position.agencyId !== ctx.agencyId) return fail(404, 'Interview not found')

  const report = await prisma.report.findUnique({ where: { candidateId: interview.candidateId } })
  if (!report) return fail(404, 'Report not ready yet')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  return ok({
    interviewId: params.id,
    overallScore: report.overallScore,
    recommendation: report.recommendation,
    professionalSummary: report.professionalSummary,
    sectionScores: report.sectionScores,
    strengthAreas: report.strengthAreas,
    concernAreas: report.concernAreas,
    questionWiseEvaluation: report.questionWiseEvaluation,
    transcriptHighlights: report.transcriptHighlights,
    hrNote: report.hrNote,
    l2Recommendation: report.l2Recommendation,
    generatedAt: report.generatedAt,
    reportUrl: `${appUrl}/report/${params.id}`,
  })
})
