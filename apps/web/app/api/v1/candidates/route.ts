import { withInterviewsApiKeyAuth, ok, fail } from '@/lib/interviews/public-auth'
import { createApiCandidate } from '@/lib/interviews/public-trigger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/candidates
 * Create a candidate (ATS-agnostic — no Hire data). Body: { name, email, phone?,
 * resumeText? }. Returns: { data: { id } }. Scoped to the API key's agency.
 */
export const POST = withInterviewsApiKeyAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.name || !body?.email) return fail(400, 'name and email are required')

  const candidate = await createApiCandidate(ctx.agencyId, {
    name: String(body.name),
    email: String(body.email),
    phone: body.phone ? String(body.phone) : null,
    resumeText: body.resumeText ? String(body.resumeText) : null,
  })
  return ok({ id: candidate.id }, 201)
})
