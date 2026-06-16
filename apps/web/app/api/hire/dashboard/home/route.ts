import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// ── Decision-first home dashboard (P0-2) ───────────────────────────────────
// ONE call returning exactly what the curated cards need: today's actions,
// a mini funnel, top AI matches, hiring velocity, and a compact activity feed.
// Deliberately lean — no vanity metrics.

const WEEK = 7 * 86400000

export const GET = withHireAuth(async (_req, ctx) => {
  const t = ctx.tenantId
  const now = new Date()
  const weekAgo = new Date(now.getTime() - WEEK)

  const [jobs, candidates, recentActivities, topMatchRows, scheduledInterviews, completedThisWeek, userCount] = await Promise.all([
    prisma.hireJob.findMany({ where: { tenantId: t }, select: { id: true, title: true, status: true, stages: true } }),
    prisma.hireCandidate.findMany({ where: { tenantId: t }, select: { id: true, currentStage: true, jobId: true, createdAt: true } }),
    prisma.hireCandidateActivity.findMany({
      where: { candidate: { tenantId: t } },
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, type: true, note: true, fromStage: true, toStage: true, createdAt: true, candidate: { select: { name: true } } },
    }),
    prisma.hireMatch.findMany({ where: { tenantId: t, score: { gte: 70 } }, orderBy: { score: 'desc' }, take: 12 }),
    prisma.hireInterview.findMany({ where: { candidate: { tenantId: t }, status: 'SCHEDULED' }, select: { candidateId: true } }),
    prisma.hireInterview.count({ where: { candidate: { tenantId: t }, status: 'COMPLETED', scheduledAt: { gte: weekAgo } } }),
    prisma.hireUser.count({ where: { tenantId: t } }),
  ])

  const activeJobs = jobs.filter((j) => j.status === 'ACTIVE')
  const firstStageOf = (j: { stages: unknown }) => (Array.isArray(j.stages) && j.stages.length ? String(j.stages[0]) : 'Sourced')
  const jobById = new Map(jobs.map((j) => [j.id, j]))

  // TODAY'S ACTIONS — concrete, each links somewhere.
  // 1) Candidates awaiting review: sitting in their job's FIRST stage (or 'Sourced').
  const awaitingReview = candidates.filter((c) => {
    const stage = c.currentStage
    const first = c.jobId && jobById.has(c.jobId) ? firstStageOf(jobById.get(c.jobId)!) : 'Sourced'
    return stage === first || stage === 'Sourced'
  }).length
  // 2) Interviews to schedule: candidates in an 'Interview'-named stage with no scheduled interview.
  const hasScheduled = new Set(scheduledInterviews.map((i) => i.candidateId))
  const interviewsToSchedule = candidates.filter((c) => /interview/i.test(c.currentStage) && !hasScheduled.has(c.id)).length
  // 3) Jobs needing attention: ACTIVE jobs with no candidates yet.
  const jobsNeedAttention = activeJobs.filter((j) => !candidates.some((c) => c.jobId === j.id)).length

  // PIPELINE HEALTH — mini funnel across canonical stage buckets.
  const bucket = (stage: string): 'Sourced' | 'Screen' | 'Interview' | 'Offer' | null => {
    const s = stage.toLowerCase()
    if (/(sourc|new|applied|inbound)/.test(s)) return 'Sourced'
    if (/(screen|review|shortlist)/.test(s)) return 'Screen'
    if (/(interview|assess)/.test(s)) return 'Interview'
    if (/(offer|hire|placed)/.test(s)) return 'Offer'
    return null
  }
  const funnelCounts: Record<string, number> = { Sourced: 0, Screen: 0, Interview: 0, Offer: 0 }
  for (const c of candidates) { const b = bucket(c.currentStage); if (b) funnelCounts[b]++ ; else funnelCounts.Sourced++ }
  const funnel = (['Sourced', 'Screen', 'Interview', 'Offer'] as const).map((name) => ({ name, count: funnelCounts[name] }))

  // TOP AI MATCHES — cached HireMatch, only for active jobs.
  const matchCandIds = topMatchRows.map((m) => m.candidateId)
  const matchJobIds = topMatchRows.map((m) => m.jobId)
  const [mCands, mJobs] = await Promise.all([
    prisma.hireCandidate.findMany({ where: { id: { in: matchCandIds }, tenantId: t }, select: { id: true, name: true, currentTitle: true } }),
    prisma.hireJob.findMany({ where: { id: { in: matchJobIds }, tenantId: t }, select: { id: true, title: true, status: true } }),
  ])
  const mc = new Map(mCands.map((c) => [c.id, c]))
  const mj = new Map(mJobs.map((j) => [j.id, j]))
  const topMatches = topMatchRows
    .filter((m) => mc.has(m.candidateId) && mj.get(m.jobId)?.status === 'ACTIVE')
    .slice(0, 6)
    .map((m) => {
      const c = mc.get(m.candidateId)!; const j = mj.get(m.jobId)!
      const reasons = Array.isArray(m.reasons) ? (m.reasons as string[]) : []
      return { candidateId: m.candidateId, candidateName: c.name, candidateTitle: c.currentTitle, jobId: m.jobId, jobTitle: j.title, score: m.score, verdict: m.verdict, reason: reasons[0] ?? null }
    })

  // HIRING VELOCITY.
  const candidatesThisWeek = candidates.filter((c) => c.createdAt >= weekAgo).length
  // Avg time-to-shortlist: createdAt → first stage_change, over the last 60 days.
  const sixtyAgo = new Date(now.getTime() - 60 * 86400000)
  const firstMoves = await prisma.hireCandidateActivity.findMany({
    where: { candidate: { tenantId: t }, type: 'stage_change', createdAt: { gte: sixtyAgo } },
    orderBy: { createdAt: 'asc' },
    select: { candidateId: true, createdAt: true },
  })
  const createdAtById = new Map(candidates.map((c) => [c.id, c.createdAt]))
  const seen = new Set<string>()
  const shortlistDays: number[] = []
  for (const a of firstMoves) {
    if (seen.has(a.candidateId)) continue
    seen.add(a.candidateId)
    const created = createdAtById.get(a.candidateId)
    if (created) shortlistDays.push((a.createdAt.getTime() - created.getTime()) / 86400000)
  }
  const avgTimeToShortlist = shortlistDays.length ? Math.round((shortlistDays.reduce((s, d) => s + d, 0) / shortlistDays.length) * 10) / 10 : null

  // RECENT ACTIVITY — compact, human-readable.
  const recent = recentActivities.map((a) => {
    let text: string
    if (a.type === 'stage_change') text = `${a.candidate.name} moved ${a.fromStage ?? '?'} → ${a.toStage ?? '?'}`
    else if (a.type === 'ai_scored') text = a.note ?? `${a.candidate.name} scored by AI`
    else text = a.note ? `${a.candidate.name}: ${a.note}` : `${a.candidate.name} — ${a.type}`
    return { id: a.id, text, at: a.createdAt }
  })

  const isEmpty = jobs.length === 0 && candidates.length === 0

  return NextResponse.json({
    isEmpty,
    gettingStarted: { job: jobs.length > 0, candidate: candidates.length > 0, teammate: userCount > 1 },
    todaysActions: { awaitingReview, interviewsToSchedule, jobsNeedAttention },
    funnel,
    topMatches,
    velocity: { avgTimeToShortlist, candidatesThisWeek, interviewsRun: completedThisWeek },
    recent,
  })
})
