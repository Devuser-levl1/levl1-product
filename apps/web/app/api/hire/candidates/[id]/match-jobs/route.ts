import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { matchJobsForCandidate, CandidateForMatch, JobForMatch } from '@/lib/hire/ai-matching'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

// POST — suggest the best-fit OPEN jobs for this candidate (tenant-scoped).
export const POST = withHireAuth(async (_req, ctx, params) => {
  const c = await prisma.hireCandidate.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!c.resumeText && !(Array.isArray(c.skills) && c.skills.length)) {
    return NextResponse.json({ matches: [], note: 'Add a résumé or skills to match this candidate to jobs.' })
  }

  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, title: true, description: true, mustHaveSkills: true, niceToHaveSkills: true, screeningCriteria: true },
  })
  if (jobs.length === 0) return NextResponse.json({ matches: [], note: 'No open jobs to match against.' })

  const candidate: CandidateForMatch = {
    id: c.id, name: c.name, currentTitle: c.currentTitle, currentCompany: c.currentCompany,
    totalYears: c.totalYears, skills: Array.isArray(c.skills) ? (c.skills as string[]) : [], resumeText: c.resumeText,
  }
  const jobsForMatch: JobForMatch[] = jobs.map((j) => ({ id: j.id, title: j.title, description: j.description, mustHaveSkills: j.mustHaveSkills, niceToHaveSkills: j.niceToHaveSkills, screeningCriteria: j.screeningCriteria }))

  console.log('[match-jobs] candidate=%s jobs=%d', c.id, jobs.length)
  const results = await matchJobsForCandidate(candidate, jobsForMatch)
  return NextResponse.json({ matches: results, currentJobId: c.jobId })
})
