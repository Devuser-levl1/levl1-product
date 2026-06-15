import { withApiKeyAuth, ok, fail } from '@/lib/api/public-auth'
import { triggerPublicInterview } from '@/lib/api/interview-trigger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/interviews
 * Trigger an interview for a candidate against either an existing Hire job or
 * an inline JD (ATS-agnostic). Body:
 *   { candidateId, jobId }            — use a Hire job, OR
 *   { candidateId, title, jdText }    — inline JD, no Hire job needed.
 * Returns: { data: { interviewId, interviewUrl } }.
 */
export const POST = withApiKeyAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.candidateId) return fail(400, 'candidateId is required')

  const hasJob = !!body.jobId
  const hasInline = !!body.title && !!body.jdText
  if (!hasJob && !hasInline) return fail(400, 'Provide either jobId, or both title and jdText')

  try {
    const result = await triggerPublicInterview({
      tenantId: ctx.tenantId,
      hireCandidateId: String(body.candidateId),
      jobId: hasJob ? String(body.jobId) : null,
      inline: hasInline ? { title: String(body.title), jdText: String(body.jdText) } : null,
    })
    return ok({ interviewId: result.interviewId, interviewUrl: result.interviewUrl }, 201)
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : 'Could not trigger interview')
  }
})
