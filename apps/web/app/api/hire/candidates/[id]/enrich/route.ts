import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { runEnrichment } from '@/lib/enrichment'

const json = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v == null ? Prisma.JsonNull : (v as Prisma.InputJsonValue)

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function loadCandidate(id: string, tenantId: string) {
  return prisma.hireCandidate.findFirst({ where: { id, tenantId }, include: { job: { select: { title: true, description: true } } } })
}

// GET — return the stored enrichment record (null until first run).
export const GET = withHireAuth(async (_req, ctx, params) => {
  const candidate = await loadCandidate(params.id, ctx.tenantId)
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const enrichment = await prisma.candidateEnrichment.findUnique({ where: { hireCandidateId: candidate.id } })
  return NextResponse.json({ enrichment })
})

// POST — run enrichment inline (idempotent; re-run allowed). Universal providers
// run within a ~12s budget; a slow provider yields `partial`, never total failure.
export const POST = withHireAuth(async (_req, ctx, params) => {
  const candidate = await loadCandidate(params.id, ctx.tenantId)
  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  console.log('[hire/enrich] running for candidate %s', candidate.id)
  const outcome = await runEnrichment({
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    currentTitle: candidate.currentTitle,
    currentCompany: candidate.currentCompany,
    linkedinUrl: candidate.linkedinUrl,
    resumeUrl: candidate.resumeUrl,
    resumeText: candidate.resumeText,
    skills: Array.isArray(candidate.skills) ? (candidate.skills as string[]) : null,
    jobTitle: candidate.job?.title ?? null,
    jobDescription: candidate.job?.description ?? null,
  })

  const data = {
    roleFamily: outcome.roleFamily,
    profile: json(outcome.merged.profile),
    company: json(outcome.merged.company),
    github: json(outcome.merged.github),
    links: json(outcome.merged.links),
    summary: outcome.merged.summary ?? null,
    status: outcome.status,
    sources: outcome.sources,
    enrichedAt: new Date(),
  }

  const enrichment = await prisma.candidateEnrichment.upsert({
    where: { hireCandidateId: candidate.id },
    update: data,
    create: { hireCandidateId: candidate.id, ...data },
  })

  await prisma.hireCandidateActivity.create({
    data: { candidateId: candidate.id, type: 'note', note: `Enrichment ${outcome.status} — sources: ${outcome.sources.join(', ') || 'none'}`, userId: ctx.userId },
  }).catch(() => {})

  console.log('[hire/enrich] %s status=%s sources=%s', candidate.id, outcome.status, outcome.sources.join(','))
  return NextResponse.json({ enrichment })
})
