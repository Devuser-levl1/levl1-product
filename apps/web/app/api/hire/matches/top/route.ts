import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — top AI-matched candidates across the tenant's open jobs (dashboard widget).
// Cached only — never computes (the per-job match endpoint populates HireMatch).
export const GET = withHireAuth(async (_req, ctx) => {
  const top = await prisma.hireMatch.findMany({
    where: { tenantId: ctx.tenantId, score: { gte: 70 } },
    orderBy: { score: 'desc' },
    take: 8,
  })
  if (top.length === 0) return NextResponse.json({ matches: [] })

  const [cands, jobs] = await Promise.all([
    prisma.hireCandidate.findMany({ where: { id: { in: top.map((m) => m.candidateId) }, tenantId: ctx.tenantId }, select: { id: true, name: true, currentTitle: true } }),
    prisma.hireJob.findMany({ where: { id: { in: top.map((m) => m.jobId) }, tenantId: ctx.tenantId }, select: { id: true, title: true, status: true } }),
  ])
  const cById = new Map(cands.map((c) => [c.id, c]))
  const jById = new Map(jobs.map((j) => [j.id, j]))
  const matches = top
    .filter((m) => cById.has(m.candidateId) && jById.get(m.jobId)?.status === 'ACTIVE')
    .map((m) => {
      const c = cById.get(m.candidateId)!
      const j = jById.get(m.jobId)!
      const reasons = Array.isArray(m.reasons) ? (m.reasons as string[]) : []
      return { candidateId: m.candidateId, candidateName: c.name, candidateTitle: c.currentTitle, jobId: m.jobId, jobTitle: j.title, score: m.score, verdict: m.verdict, reason: reasons[0] ?? null }
    })
  return NextResponse.json({ matches })
})
