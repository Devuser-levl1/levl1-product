import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — cached ranked matches for this job (fast; no recompute). The
// match-candidates POST populates these.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId }, select: { id: true } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const matches = await prisma.hireMatch.findMany({ where: { tenantId: ctx.tenantId, jobId: job.id }, orderBy: { score: 'desc' } })
  const cands = await prisma.hireCandidate.findMany({
    where: { id: { in: matches.map((m) => m.candidateId) }, tenantId: ctx.tenantId },
    select: { id: true, name: true, currentTitle: true, currentCompany: true, currentStage: true, jobId: true, aiScore: true },
  })
  const byId = new Map(cands.map((c) => [c.id, c]))
  const ranked = matches.filter((m) => byId.has(m.candidateId)).map((m) => {
    const c = byId.get(m.candidateId)!
    return {
      candidateId: m.candidateId, name: c.name, currentTitle: c.currentTitle, currentCompany: c.currentCompany,
      inThisJob: c.jobId === job.id, currentStage: c.currentStage, aiScore: c.aiScore,
      score: m.score, verdict: m.verdict, reasons: m.reasons, matchedSkills: m.matchedSkills, missingSkills: m.missingSkills,
    }
  })
  return NextResponse.json({ matches: ranked, computed: matches.length > 0 })
})
