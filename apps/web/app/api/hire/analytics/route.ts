import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import {
  avg, computeFunnel, computeSourceEffectiveness, computeTimeInStage, computeScoreBuckets,
  computeRecruiterActivity, computeWeeklyTrend, computeDealMetrics, computeAvgTimeToHire,
} from '@/lib/hire/analytics'

export const dynamic = 'force-dynamic'

// 60-second in-memory cache per tenant+range key (single-instance Render).
const cache = new Map<string, { ts: number; data: unknown }>()
const TTL = 60 * 1000

export const GET = withHireAuth(async (req, ctx) => {
  const sp = new URL(req.url).searchParams
  // Guard against malformed/invalid date params (NaN dates → Prisma errors → 500
  // → the client keeps retrying). Fall back to a sane 90-day window.
  const parseDate = (v: string | null, fallback: Date) => {
    if (!v) return fallback
    const d = new Date(v)
    return isNaN(d.getTime()) ? fallback : d
  }
  const from = parseDate(sp.get('from'), new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  const to = parseDate(sp.get('to'), new Date())
  const jobId = sp.get('jobId') || undefined

  try {
  console.log('[api/hire/analytics] tenant=%s from=%s to=%s job=%s', ctx.tenantId, from.toISOString(), to.toISOString(), jobId ?? 'all')

  const key = `${ctx.tenantId}|${from.toISOString()}|${to.toISOString()}|${jobId ?? 'all'}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return NextResponse.json(hit.data)

  const candidateWhere = { tenantId: ctx.tenantId, ...(jobId ? { jobId } : {}), createdAt: { gte: from, lte: to } }

  const [totalCandidates, candidates, jobs, activities, deals, hires, users] = await Promise.all([
    prisma.hireCandidate.count({ where: candidateWhere }),
    prisma.hireCandidate.findMany({ where: candidateWhere, select: { id: true, currentStage: true, aiScore: true, interviewScore: true, source: true, createdAt: true, jobId: true } }),
    prisma.hireJob.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, title: true, status: true, stages: true } }),
    prisma.hireCandidateActivity.findMany({ where: { candidate: { tenantId: ctx.tenantId }, createdAt: { gte: from, lte: to } }, select: { id: true, type: true, fromStage: true, toStage: true, userId: true, createdAt: true, candidateId: true } }),
    prisma.hireDeal.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, value: true, stage: true, closedAt: true, createdAt: true } }),
    prisma.hireCandidate.findMany({ where: { tenantId: ctx.tenantId, currentStage: { in: ['Hired', 'Offer'] }, updatedAt: { gte: from, lte: to } }, select: { id: true, createdAt: true, updatedAt: true } }),
    prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true } }),
  ])

  const userName: Record<string, string> = {}
  users.forEach((u) => { userName[u.id] = u.name })

  const dealMetrics = computeDealMetrics(deals)
  const recruiterActivity = computeRecruiterActivity(activities).map((r) => ({ ...r, name: userName[r.userId] ?? 'Unknown' }))

  const data = {
    summary: {
      totalCandidates,
      activeJobs: jobs.filter((j) => j.status === 'ACTIVE').length,
      avgAiScore: avg(candidates.map((c) => c.aiScore)),
      avgInterviewScore: avg(candidates.map((c) => c.interviewScore)),
      hires: hires.length,
      avgTimeToHireDays: computeAvgTimeToHire(hires),
      openPipelineValue: dealMetrics.openValue,
      wonValue: dealMetrics.wonValue,
    },
    funnel: computeFunnel(candidates),
    sources: computeSourceEffectiveness(candidates),
    timeInStage: computeTimeInStage(activities),
    scoreDistribution: computeScoreBuckets(candidates),
    recruiterActivity,
    trend: computeWeeklyTrend(candidates),
    dealMetrics,
    teamSize: users.length,
  }

  console.log('[api/hire/analytics] ok tenant=%s candidates=%d', ctx.tenantId, totalCandidates)
  cache.set(key, { ts: Date.now(), data })
  return NextResponse.json(data)
  } catch (err) {
    console.error('[api/hire/analytics] failed tenant=%s:', ctx.tenantId, err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
})
