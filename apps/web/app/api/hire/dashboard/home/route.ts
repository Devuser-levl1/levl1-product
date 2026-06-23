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

  const eightWeeksAgo = new Date(now.getTime() - 8 * WEEK)
  const ninetyAgo = new Date(now.getTime() - 90 * 86400000)
  const [jobs, candidates, recentActivities, topMatchRows, scheduledInterviews, completedThisWeek, userCount, deals, stageMoves90, completedInterviews8w] = await Promise.all([
    prisma.hireJob.findMany({ where: { tenantId: t }, select: { id: true, title: true, status: true, stages: true, createdAt: true } }),
    prisma.hireCandidate.findMany({ where: { tenantId: t }, select: { id: true, name: true, currentStage: true, jobId: true, createdAt: true, updatedAt: true } }),
    prisma.hireCandidateActivity.findMany({
      where: { candidate: { tenantId: t } },
      orderBy: { createdAt: 'desc' }, take: 10,
      select: { id: true, type: true, note: true, fromStage: true, toStage: true, createdAt: true, candidate: { select: { name: true } } },
    }),
    prisma.hireMatch.findMany({ where: { tenantId: t, score: { gte: 70 } }, orderBy: { score: 'desc' }, take: 12 }),
    prisma.hireInterview.findMany({ where: { candidate: { tenantId: t }, status: 'SCHEDULED' }, select: { candidateId: true } }),
    prisma.hireInterview.count({ where: { candidate: { tenantId: t }, status: 'COMPLETED', scheduledAt: { gte: weekAgo } } }),
    prisma.hireUser.count({ where: { tenantId: t } }),
    prisma.hireDeal.findMany({ where: { tenantId: t }, select: { id: true, title: true, value: true, stage: true, updatedAt: true } }),
    prisma.hireCandidateActivity.findMany({ where: { candidate: { tenantId: t }, type: 'stage_change', createdAt: { gte: ninetyAgo } }, orderBy: { createdAt: 'asc' }, select: { candidateId: true, fromStage: true, toStage: true, createdAt: true } }),
    prisma.hireInterview.findMany({ where: { candidate: { tenantId: t }, status: 'COMPLETED', scheduledAt: { gte: eightWeeksAgo } }, select: { scheduledAt: true } }),
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

  // Avg days candidates sit in each canonical stage (from 90d of stage moves) →
  // drives the BOTTLENECK highlight. >14d = bad (amber/red), >7d = watch.
  const stageDwell: Record<string, number[]> = {}
  const enteredAt = new Map<string, number>()
  for (const m of stageMoves90) {
    if (m.fromStage) {
      const b = bucket(m.fromStage); const k = m.candidateId + '|' + m.fromStage; const e = enteredAt.get(k)
      if (b && e) (stageDwell[b] ??= []).push((+new Date(m.createdAt) - e) / 86400000)
    }
    if (m.toStage) enteredAt.set(m.candidateId + '|' + m.toStage, +new Date(m.createdAt))
  }
  const avgDwell = (b: string): number | null => { const a = stageDwell[b]; return a && a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null }
  const funnel = (['Sourced', 'Screen', 'Interview', 'Offer'] as const).map((name, i, arr) => {
    const d = avgDwell(name)
    const severity = d == null ? 'ok' : d > 14 ? 'bad' : d > 7 ? 'warn' : 'ok'
    const prevCount = i > 0 ? funnelCounts[arr[i - 1]] : null
    return { name, count: funnelCounts[name], avgDays: d, severity, conversionFromPrev: prevCount && prevCount > 0 ? Math.round((funnelCounts[name] / prevCount) * 100) : null }
  })

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

  // ── VELOCITY TRENDS — weekly series (8 wks) + this-vs-last delta ──
  const weeklySeries = (dates: (Date | string)[], weeks = 8): number[] => {
    const arr = new Array(weeks).fill(0)
    for (const dd of dates) { const idx = Math.floor((now.getTime() - +new Date(dd)) / WEEK); if (idx >= 0 && idx < weeks) arr[weeks - 1 - idx]++ }
    return arr
  }
  const candSpark = weeklySeries(candidates.map((c) => c.createdAt))
  const intSpark = weeklySeries(completedInterviews8w.map((i) => i.scheduledAt))
  const moveSpark = weeklySeries(stageMoves90.map((m) => m.createdAt))

  // Time-to-shortlist this 30d vs previous 30d.
  const firstMoveAt = new Map<string, number>()
  for (const m of stageMoves90) if (!firstMoveAt.has(m.candidateId)) firstMoveAt.set(m.candidateId, +new Date(m.createdAt))
  const createdById = new Map(candidates.map((c) => [c.id, +new Date(c.createdAt)]))
  const shortlistAvg = (start: number, end: number): number | null => {
    const ds: number[] = []
    firstMoveAt.forEach((mt, cid) => { if (mt >= start && mt < end) { const cr = createdById.get(cid); if (cr != null) ds.push((mt - cr) / 86400000) } })
    return ds.length ? Math.round((ds.reduce((a, b) => a + b, 0) / ds.length) * 10) / 10 : null
  }
  const DAY = 86400000
  const ttsCurrent = shortlistAvg(now.getTime() - 30 * DAY, now.getTime())
  const ttsPrev = shortlistAvg(now.getTime() - 60 * DAY, now.getTime() - 30 * DAY)

  const velocityTrends = [
    { key: 'candidates', label: 'Candidates added', value: candSpark[7], prev: candSpark[6], unit: '/wk', betterWhenLower: false, spark: candSpark },
    { key: 'interviews', label: 'Interviews run', value: intSpark[7], prev: intSpark[6], unit: '/wk', betterWhenLower: false, spark: intSpark },
    { key: 'moves', label: 'Pipeline moves', value: moveSpark[7], prev: moveSpark[6], unit: '/wk', betterWhenLower: false, spark: moveSpark },
    { key: 'tts', label: 'Time-to-shortlist', value: ttsCurrent, prev: ttsPrev, unit: 'd', betterWhenLower: true, spark: null as number[] | null },
  ]

  // ── INSIGHTS — "Needs you today" action cards derived from real data ──
  const TERMINAL = (s: string) => /hire|reject|placed/i.test(s)
  const idleCandidates = candidates.filter((c) => !TERMINAL(c.currentStage) && (now.getTime() - +new Date(c.updatedAt)) / DAY > 7)
  const stallingDeals = deals.filter((d) => !['Closed Won', 'Closed Lost'].includes(d.stage) && (now.getTime() - +new Date(d.updatedAt)) / DAY > 14)
  const strongMatches = topMatches.filter((m) => m.score >= 80)
  const slowStage = funnel.filter((f) => f.severity !== 'ok').sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))[0]

  type Insight = { id: string; severity: 'bad' | 'warn' | 'good'; icon: string; title: string; body: string; actionLabel: string; href: string }
  const insights: Insight[] = []
  if (idleCandidates.length > 0) insights.push({ id: 'idle', severity: idleCandidates.length >= 5 ? 'bad' : 'warn', icon: '⏳', title: `${idleCandidates.length} candidate${idleCandidates.length > 1 ? 's' : ''} idle 7+ days`, body: 'They haven’t moved in over a week — review and advance or reject.', actionLabel: 'Review pipeline', href: '/hire/pipeline' })
  if (interviewsToSchedule > 0) insights.push({ id: 'unsched', severity: 'warn', icon: '📅', title: `${interviewsToSchedule} interview${interviewsToSchedule > 1 ? 's' : ''} to schedule`, body: 'Candidates sit in an interview stage with nothing booked.', actionLabel: 'Schedule now', href: '/hire/interviews' })
  if (slowStage) insights.push({ id: 'bottleneck', severity: slowStage.severity as 'bad' | 'warn', icon: '🐢', title: `${slowStage.name} is a bottleneck`, body: `Candidates wait ~${slowStage.avgDays} days here on average — clear the backlog.`, actionLabel: 'Open pipeline', href: '/hire/pipeline' })
  if (stallingDeals.length > 0) insights.push({ id: 'deals', severity: 'warn', icon: '💼', title: `${stallingDeals.length} deal${stallingDeals.length > 1 ? 's' : ''} stalling`, body: 'No movement in 2+ weeks — nudge these forward.', actionLabel: 'Open CRM', href: '/hire/crm' })
  if (strongMatches.length > 0) insights.push({ id: 'matches', severity: 'good', icon: '✨', title: `${strongMatches.length} strong match${strongMatches.length > 1 ? 'es' : ''} ready`, body: `Top: ${strongMatches[0].candidateName} → ${strongMatches[0].jobTitle} (${strongMatches[0].score}).`, actionLabel: 'Open match', href: `/hire/jobs/${strongMatches[0].jobId}` })
  if (jobsNeedAttention > 0) insights.push({ id: 'jobs', severity: 'warn', icon: '📋', title: `${jobsNeedAttention} job${jobsNeedAttention > 1 ? 's' : ''} need candidates`, body: 'Active roles with no candidates yet — start sourcing.', actionLabel: 'View jobs', href: '/hire/jobs' })
  const rank = { bad: 0, warn: 1, good: 2 }
  const topInsights = insights.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 3)

  const isEmpty = jobs.length === 0 && candidates.length === 0

  return NextResponse.json({
    isEmpty,
    gettingStarted: { job: jobs.length > 0, candidate: candidates.length > 0, teammate: userCount > 1 },
    todaysActions: { awaitingReview, interviewsToSchedule, jobsNeedAttention },
    insights: topInsights,
    funnel,
    velocityTrends,
    topMatches,
    velocity: { avgTimeToShortlist, candidatesThisWeek, interviewsRun: completedThisWeek },
    recent,
  })
})
