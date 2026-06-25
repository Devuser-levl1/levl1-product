import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { isManagerPlus } from '@/lib/hire/roles'

export const dynamic = 'force-dynamic'

const DAY = 86400000
const STALL_DAYS = 14
const AGE_WARN = 21
const AGE_BAD = 45

// Manager/Admin oversight — aggregates jobs, candidates and activity into a
// team view. Tenant-scoped; role-gated (recruiters get 403).
export const GET = withHireAuth(async (_req, ctx) => {
  if (!isManagerPlus(ctx.role)) return NextResponse.json({ error: 'Managers only' }, { status: 403 })
  const t = ctx.tenantId
  const now = Date.now()
  const sixtyAgo = new Date(now - 60 * DAY)

  const [users, jobs, candidates, activities, hires] = await Promise.all([
    prisma.hireUser.findMany({ where: { tenantId: t }, select: { id: true, name: true, email: true, role: true } }),
    prisma.hireJob.findMany({ where: { tenantId: t }, select: { id: true, title: true, status: true, assigneeId: true, createdAt: true, stages: true } }),
    prisma.hireCandidate.findMany({ where: { tenantId: t }, select: { id: true, jobId: true, assigneeId: true, currentStage: true, createdAt: true, updatedAt: true } }),
    prisma.hireCandidateActivity.findMany({ where: { candidate: { tenantId: t }, createdAt: { gte: sixtyAgo } }, select: { userId: true, createdAt: true, candidate: { select: { jobId: true } } } }),
    prisma.hireCandidate.findMany({ where: { tenantId: t, currentStage: { in: ['Hired', 'Offer'] } }, select: { assigneeId: true, createdAt: true, updatedAt: true } }),
  ])

  // Per-job latest activity (from its candidates' activity).
  const jobLastActivity = new Map<string, number>()
  const userActivity30 = new Map<string, number>()
  const thirtyAgo = now - 30 * DAY
  for (const a of activities) {
    const ts = +new Date(a.createdAt)
    const jid = a.candidate?.jobId
    if (jid) jobLastActivity.set(jid, Math.max(jobLastActivity.get(jid) ?? 0, ts))
    if (a.userId && ts >= thirtyAgo) userActivity30.set(a.userId, (userActivity30.get(a.userId) ?? 0) + 1)
  }

  const candsByJob = new Map<string, typeof candidates>()
  for (const c of candidates) { if (!c.jobId) continue; if (!candsByJob.has(c.jobId)) candsByJob.set(c.jobId, []); candsByJob.get(c.jobId)!.push(c) }

  // Enriched open jobs (ageing + stalled).
  const openJobs = jobs.filter((j) => j.status === 'ACTIVE')
  const jobRows = openJobs.map((j) => {
    const daysOpen = Math.round((now - +new Date(j.createdAt)) / DAY)
    const cs = candsByJob.get(j.id) ?? []
    const last = jobLastActivity.get(j.id) ?? +new Date(j.createdAt)
    const daysSinceActivity = Math.round((now - last) / DAY)
    const ageSeverity = daysOpen > AGE_BAD ? 'bad' : daysOpen > AGE_WARN ? 'warn' : 'ok'
    return {
      id: j.id, title: j.title, assigneeId: j.assigneeId, daysOpen, pipelineCount: cs.length,
      lastActivityAt: new Date(last).toISOString(), daysSinceActivity,
      stalled: daysSinceActivity >= STALL_DAYS, ageSeverity,
      topStage: cs.length ? Object.entries(cs.reduce((m: Record<string, number>, c) => { m[c.currentStage] = (m[c.currentStage] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1])[0][0] : null,
    }
  }).sort((a, b) => b.daysOpen - a.daysOpen)

  // Per-member workload + metrics.
  const members = users.map((u) => {
    const myJobs = openJobs.filter((j) => j.assigneeId === u.id)
    const myCands = candidates.filter((c) => c.assigneeId === u.id)
    const inProgress = myCands.filter((c) => !/hired|rejected|placed/i.test(c.currentStage)).length
    const myHires = hires.filter((h) => h.assigneeId === u.id)
    const ttf = myHires.length ? Math.round(myHires.reduce((s, h) => s + (+new Date(h.updatedAt) - +new Date(h.createdAt)) / DAY, 0) / myHires.length) : null
    return {
      id: u.id, name: u.name, email: u.email, role: u.role,
      activeJobs: myJobs.length, candidatesInProgress: inProgress, totalCandidates: myCands.length,
      placements: myHires.length, avgTimeToFill: ttf, activity30d: userActivity30.get(u.id) ?? 0,
      stalledJobs: jobRows.filter((j) => j.assigneeId === u.id && j.stalled).length,
    }
  }).sort((a, b) => b.activeJobs - a.activeJobs)

  const totalHires = hires.length
  const avgTimeToFill = totalHires ? Math.round(hires.reduce((s, h) => s + (+new Date(h.updatedAt) - +new Date(h.createdAt)) / DAY, 0) / totalHires) : null
  const fillRate = openJobs.length + totalHires > 0 ? Math.round((totalHires / (openJobs.length + totalHires)) * 100) : 0

  return NextResponse.json({
    members, jobs: jobRows,
    metrics: { openJobs: openJobs.length, placements: totalHires, avgTimeToFill, fillRate, unassignedJobs: openJobs.filter((j) => !j.assigneeId).length, stalledJobs: jobRows.filter((j) => j.stalled).length },
    thresholds: { ageWarn: AGE_WARN, ageBad: AGE_BAD, stallDays: STALL_DAYS },
  })
})
