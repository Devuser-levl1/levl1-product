import { withApiKeyAuth, ok, fail } from '@/lib/api/public-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/candidates
 * Create a candidate. Body: { name, email, phone?, resumeUrl?, resumeText? }.
 * Returns: { data: { id } }. Tenant-scoped by API key.
 */
export const POST = withApiKeyAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.name || !body?.email) return fail(400, 'name and email are required')

  const candidate = await prisma.hireCandidate.create({
    data: {
      tenantId: ctx.tenantId,
      name: String(body.name),
      email: String(body.email).toLowerCase(),
      phone: body.phone ? String(body.phone) : null,
      resumeUrl: body.resumeUrl ? String(body.resumeUrl) : null,
      resumeText: body.resumeText ? String(body.resumeText) : null,
      source: 'API',
      currentStage: 'Sourced',
    },
    select: { id: true },
  })
  return ok({ id: candidate.id }, 201)
})
