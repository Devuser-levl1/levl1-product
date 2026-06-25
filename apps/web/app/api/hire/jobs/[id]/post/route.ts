import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { toJobForPosting, postOne } from '@/lib/hire/boards/post'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const JOB_SELECT = { id: true, title: true, description: true, location: true, salaryMin: true, salaryMax: true, applySlug: true, mustHaveSkills: true, niceToHaveSkills: true, client: { select: { name: true } } }

// POST /api/hire/jobs/[id]/post — one-click post to the selected connected boards
// (BYOB, in parallel). Body: { providers: string[], extra?: { [provider]: {field:val} } }.
export const POST = withHireAuth(async (req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: JOB_SELECT })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const providers: string[] = Array.isArray(body.providers) ? body.providers.filter((p: unknown) => typeof p === 'string') : []
  if (providers.length === 0) return NextResponse.json({ error: 'Select at least one board.' }, { status: 400 })
  const extraByProvider: Record<string, Record<string, string>> = body.extra && typeof body.extra === 'object' ? body.extra : {}

  const jobForPosting = toJobForPosting(job)
  const results = await Promise.all(providers.map((provider) =>
    postOne({ tenantId: ctx.tenantId, userId: ctx.userId, jobId: job.id, job: jobForPosting, provider, extra: extraByProvider[provider] }),
  ))
  return NextResponse.json({ results })
})
