import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { poolSkillSource } from '@/lib/hire/skills'

export const dynamic = 'force-dynamic'

// Cap the working set; the pool view does sort/filter/search client-side over
// this set so every (including computed) column is fully sortable.
const CAP = 2000

function deriveStatus(stage: string, jobId: string | null): { status: string; tone: 'rejected' | 'hired' | 'active' | 'pool' } {
  const s = (stage || '').toLowerCase()
  if (s.includes('reject')) return { status: 'Rejected', tone: 'rejected' }
  if (s.includes('hire') || s.includes('placed')) return { status: 'Hired', tone: 'hired' }
  if (!jobId) return { status: 'In talent pool', tone: 'pool' }
  return { status: `Active · ${stage}`, tone: 'active' }
}

// The central, ever-growing talent pool: every candidate the tenant has ever
// processed, regardless of job/stage/source. Persists after job close or reject.
export const GET = withHireAuth(async (_req, ctx) => {
  const t = ctx.tenantId

  const [candidates, jobs, bestScores, matchLinks] = await Promise.all([
    prisma.hireCandidate.findMany({
      where: { tenantId: t },
      orderBy: { createdAt: 'desc' },
      take: CAP,
      select: {
        id: true, name: true, email: true, currentTitle: true, currentCompany: true,
        currentStage: true, aiScore: true, interviewScore: true, source: true,
        skills: true, topSkills: true, jobId: true, createdAt: true, updatedAt: true,
        job: { select: { id: true, title: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.hireJob.findMany({ where: { tenantId: t }, select: { id: true, title: true } }),
    // Best AI score ever, across every job this candidate was matched against.
    prisma.hireMatch.groupBy({ by: ['candidateId'], where: { tenantId: t }, _max: { score: true } }),
    // Every job a candidate has been associated with (matched against).
    prisma.hireMatch.findMany({ where: { tenantId: t }, select: { candidateId: true, jobId: true } }),
  ])

  const jobTitle = new Map(jobs.map((j) => [j.id, j.title]))
  const bestByCand = new Map(bestScores.map((b) => [b.candidateId, b._max.score ?? null]))
  const jobsByCand = new Map<string, Set<string>>()
  for (const m of matchLinks) {
    if (!jobsByCand.has(m.candidateId)) jobsByCand.set(m.candidateId, new Set())
    jobsByCand.get(m.candidateId)!.add(m.jobId)
  }

  const rows = candidates.map((c) => {
    // Prefer the concise raw skills (clean tags) over the descriptive top-skill phrases.
    const skillsArr = poolSkillSource(c.skills, c.topSkills)
    const assoc = jobsByCand.get(c.id) ?? new Set<string>()
    if (c.jobId) assoc.add(c.jobId)
    const associatedJobs = Array.from(assoc).map((id) => ({ id, title: jobTitle.get(id) ?? 'Unknown job' }))
    const matchBest = bestByCand.get(c.id) ?? null
    const bestScore = Math.max(matchBest ?? -1, c.aiScore ?? -1)
    const { status, tone } = deriveStatus(c.currentStage, c.jobId)
    const lastActivityAt = c.activities[0]?.createdAt ?? c.updatedAt
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      currentTitle: c.currentTitle,
      currentCompany: c.currentCompany,
      topSkills: skillsArr.slice(0, 6),
      bestScore: bestScore >= 0 ? bestScore : null,
      lastScore: c.aiScore ?? null,
      interviewScore: c.interviewScore ?? null,
      source: c.source,
      status,
      statusTone: tone,
      stage: c.currentStage,
      jobs: associatedJobs,
      jobsCount: associatedJobs.length,
      lastActivityAt,
      createdAt: c.createdAt,
    }
  })

  return NextResponse.json({ rows, total: rows.length, capped: candidates.length >= CAP })
})
