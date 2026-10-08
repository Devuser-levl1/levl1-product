import { withApiKeyAuth, ok, fail } from '@/lib/api/public-auth'
import { prisma } from '@/lib/prisma'
import { addCandidateToJob } from '@/lib/hire/candidate-ownership'
import { checkAllowance, incrementUsage } from '@/lib/hire/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Normalize an extension-reported board into a Levl1 source tag.
function sourceTag(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'indeed') return 'Indeed'
  if (s === 'linkedin') return 'LinkedIn'
  if (s === 'naukri') return 'Naukri'
  return 'Sourced'
}

/**
 * POST /api/v1/hire/capture — the Levl1 browser extension sends ONE recruiter-
 * captured profile here (human-driven, one at a time — no bulk auto-pull). The
 * candidate is deduped per job, added to the job's pipeline, source-tagged, and
 * scored against the job. Tenant-scoped via the API key.
 *
 * Body: { name, email?, phone?, title?, company?, location?, profileUrl?,
 *         source?, jobId? }
 */
export const POST = withApiKeyAuth(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  if (!body?.name) return fail(400, 'name is required')

  const jobId: string | null = body.jobId ? String(body.jobId) : null
  let firstStage = 'Sourced'
  if (jobId) {
    const job = await prisma.hireJob.findFirst({ where: { id: jobId, tenantId: ctx.tenantId }, select: { stages: true } })
    if (!job) return fail(404, 'Job not found for this tenant')
    const stages = Array.isArray(job.stages) ? (job.stages as string[]) : []
    firstStage = stages[0] ?? 'Sourced'
  }

  const allow = await checkAllowance(ctx.tenantId, 'candidate')
  if (!allow.allowed) return fail(402, allow.message ?? 'Candidate limit reached.')

  const source = sourceTag(body.source)
  const email = body.email ? String(body.email).toLowerCase() : null
  // Compose a résumé-text snippet from what was visible on the page so the
  // existing job matcher has content to score against.
  const resumeText = [
    body.name && `Name: ${body.name}`,
    body.title && `Title: ${body.title}`,
    body.company && `Company: ${body.company}`,
    body.location && `Location: ${body.location}`,
    body.profileUrl && `Profile: ${body.profileUrl}`,
  ].filter(Boolean).join('\n') || null

  const result = await addCandidateToJob({
    tenantId: ctx.tenantId, jobId, // extension capture has no Levl1 user → no owner claimed
    data: {
      name: String(body.name),
      email,
      phone: body.phone ? String(body.phone) : null,
      currentTitle: body.title ? String(body.title) : null,
      currentCompany: body.company ? String(body.company) : null,
      linkedinUrl: body.profileUrl ? String(body.profileUrl) : null,
      resumeText,
      source,
      currentStage: firstStage,
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'
  const candidateUrl = `${appUrl}/hire/candidates?id=${result.candidate.id}`

  if (!result.created) {
    // Already on this job — surface the existing record, don't duplicate.
    return ok({ id: result.candidate.id, duplicate: true, owner: result.owner, candidateUrl }, 200)
  }

  await prisma.hireCandidateActivity.create({
    data: { candidateId: result.candidate.id, type: 'note', note: `Captured from ${source} via the Levl1 browser extension` },
  }).catch(() => {})
  await incrementUsage(ctx.tenantId, 'candidate')

  // Score against the job (or a baseline summary when captured to the pool).
  try {
    const { enqueue } = await import('@/lib/hire/jobs/queue')
    await enqueue(jobId ? 'hire-score-candidate' : 'hire-baseline-summary', { candidateId: result.candidate.id })
  } catch (e) {
    console.error('[v1/hire/capture] enqueue failed:', e instanceof Error ? e.message : e)
  }

  return ok({ id: result.candidate.id, duplicate: false, source, jobId, candidateUrl }, 201)
})
