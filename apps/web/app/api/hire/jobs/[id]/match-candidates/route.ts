import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { matchCandidatesToJob, verdictToRecommendation, coerceRubric, CandidateForMatch, JobForMatch } from '@/lib/hire/ai-matching'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const POOL_CAP = 60

function toJob(j: { id: string; title: string; description: string; mustHaveSkills: string[]; niceToHaveSkills: string[]; screeningCriteria: string[]; rubric: unknown }): JobForMatch {
  return { id: j.id, title: j.title, description: j.description, mustHaveSkills: j.mustHaveSkills, niceToHaveSkills: j.niceToHaveSkills, screeningCriteria: j.screeningCriteria, rubric: coerceRubric(j.rubric) }
}

// POST — rank the candidate pool for this job, cache to HireMatch, return ranked.
// ?refresh=true recomputes even if cached.
export const POST = withHireAuth(async (req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const refresh = new URL(req.url).searchParams.get('refresh') === 'true'
  const existing = await prisma.hireMatch.count({ where: { tenantId: ctx.tenantId, jobId: job.id } })
  if (existing > 0 && !refresh) {
    return rankedResponse(ctx.tenantId, job.id)
  }

  // Pool: tenant candidates with something to match on (resume or skills).
  const pool = await prisma.hireCandidate.findMany({
    where: { tenantId: ctx.tenantId, OR: [{ resumeText: { not: null } }, { skills: { not: Prisma.AnyNull } }] },
    orderBy: { createdAt: 'desc' },
    take: POOL_CAP,
    select: { id: true, name: true, currentTitle: true, currentCompany: true, totalYears: true, skills: true, resumeText: true },
  })
  if (pool.length === 0) return NextResponse.json({ matches: [], note: 'No candidates with a résumé or skills to match yet.' })

  const candidates: CandidateForMatch[] = pool.map((c) => ({
    id: c.id, name: c.name, currentTitle: c.currentTitle, currentCompany: c.currentCompany,
    totalYears: c.totalYears, skills: Array.isArray(c.skills) ? (c.skills as string[]) : [], resumeText: c.resumeText,
  }))

  console.log('[match-candidates] job=%s pool=%d refresh=%s', job.id, candidates.length, refresh)
  const results = await matchCandidatesToJob(toJob(job), candidates)

  // Upsert cache.
  for (const r of results) {
    await prisma.hireMatch.upsert({
      where: { jobId_candidateId: { jobId: job.id, candidateId: r.candidateId } },
      update: { score: r.score, verdict: r.verdict, reasons: r.reasons as Prisma.InputJsonValue, matchedSkills: r.matchedSkills, missingSkills: r.missingSkills, createdAt: new Date() },
      create: { tenantId: ctx.tenantId, jobId: job.id, candidateId: r.candidateId, score: r.score, verdict: r.verdict, reasons: r.reasons as Prisma.InputJsonValue, matchedSkills: r.matchedSkills, missingSkills: r.missingSkills },
    }).catch((e) => console.error('[match-candidates] upsert failed:', e))
  }

  // Mirror onto candidates whose PRIMARY (attached) job is this job, so legacy
  // displays + analytics read the same number as their HireMatch row.
  const attachedHere = await prisma.hireCandidate.findMany({ where: { tenantId: ctx.tenantId, jobId: job.id }, select: { id: true } })
  const attachedIds = new Set(attachedHere.map((c) => c.id))
  for (const r of results) {
    if (!attachedIds.has(r.candidateId)) continue
    await prisma.hireCandidate.update({
      where: { id: r.candidateId },
      data: { aiScore: r.score, aiRecommendation: verdictToRecommendation(r.verdict) },
    }).catch(() => {})
  }

  return rankedResponse(ctx.tenantId, job.id)
})

// Shared: join cached matches with candidate display info, sorted by score.
async function rankedResponse(tenantId: string, jobId: string) {
  const matches = await prisma.hireMatch.findMany({ where: { tenantId, jobId }, orderBy: { score: 'desc' } })
  const ids = matches.map((m) => m.candidateId)
  const cands = await prisma.hireCandidate.findMany({ where: { id: { in: ids }, tenantId }, select: { id: true, name: true, currentTitle: true, currentCompany: true, currentStage: true, jobId: true, aiScore: true } })
  const byId = new Map(cands.map((c) => [c.id, c]))
  const ranked = matches
    .filter((m) => byId.has(m.candidateId))
    .map((m) => {
      const c = byId.get(m.candidateId)!
      return {
        candidateId: m.candidateId,
        name: c.name, currentTitle: c.currentTitle, currentCompany: c.currentCompany,
        inThisJob: c.jobId === jobId, currentStage: c.currentStage, aiScore: c.aiScore,
        score: m.score, verdict: m.verdict, reasons: m.reasons, matchedSkills: m.matchedSkills, missingSkills: m.missingSkills,
      }
    })
  return NextResponse.json({ matches: ranked })
}
