import { withInterviewsApiKeyAuth, ok, fail } from '@/lib/interviews/public-auth'
import { triggerInterview } from '@/lib/interviews/public-trigger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/v1/interviews
 * Trigger an interview for a candidate against an inline JD or an existing
 * Interviews position (ATS-agnostic — no Hire job). Body:
 *   { candidateId, title, jdText }   — inline JD, OR
 *   { candidateId, positionId }      — an existing Interviews position.
 * Returns: { data: { interviewId, interviewUrl } }.
 */
export const POST = withInterviewsApiKeyAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.candidateId) return fail(400, 'candidateId is required')

  const hasInline = !!body.title && !!body.jdText
  const hasPosition = !!body.positionId
  if (!hasInline && !hasPosition) return fail(400, 'Provide either positionId, or both title and jdText')

  try {
    const result = await triggerInterview({
      agencyId: ctx.agencyId,
      candidateId: String(body.candidateId),
      inline: hasInline ? { title: String(body.title), jdText: String(body.jdText) } : null,
      positionId: hasPosition ? String(body.positionId) : null,
    })
    return ok(result, 201)
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : 'Could not trigger interview')
  }
})
