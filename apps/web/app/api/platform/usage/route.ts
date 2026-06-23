import { NextResponse } from 'next/server'
import { withPlatformAuth } from '@/lib/platform/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DAY = 86400000
const WEEK = 7 * DAY

// Cross-tenant usage ledger — how every client uses the app. Platform-staff only.
export const GET = withPlatformAuth(async () => {
  const now = Date.now()
  const monthAgo = new Date(now - 30 * DAY)
  const eightWeeksAgo = new Date(now - 8 * WEEK)

  const [tenants, users, jobs, candidates, interviews, deals, activities, audit] = await Promise.all([
    prisma.hireTenant.findMany({ select: { id: true, name: true, type: true, plan: true, trialEndsAt: true, trialActive: true, subscriptionStatus: true, createdAt: true } }),
    prisma.hireUser.findMany({ select: { tenantId: true, lastLoginAt: true } }),
    prisma.hireJob.findMany({ select: { tenantId: true, status: true } }),
    prisma.hireCandidate.findMany({ select: { tenantId: true, createdAt: true } }),
    prisma.hireInterview.findMany({ select: { candidate: { select: { tenantId: true } } } }),
    prisma.hireDeal.findMany({ select: { tenantId: true, value: true, stage: true } }),
    prisma.hireCandidateActivity.findMany({ where: { createdAt: { gte: eightWeeksAgo } }, select: { type: true, createdAt: true, candidate: { select: { tenantId: true } } } }),
    prisma.hireAuditLog.findMany({ where: { createdAt: { gte: eightWeeksAgo } }, select: { tenantId: true, action: true, createdAt: true } }),
  ])

  // Per-tenant rollups.
  type Roll = { users: number; logins7d: number; jobs: number; activeJobs: number; candidates: number; candidates30d: number; interviews: number; deals: number; pipelineValue: number; lastActiveAt: number; events8w: number; spark: number[] }
  const empty = (): Roll => ({ users: 0, logins7d: 0, jobs: 0, activeJobs: 0, candidates: 0, candidates30d: 0, interviews: 0, deals: 0, pipelineValue: 0, lastActiveAt: 0, events8w: 0, spark: new Array(8).fill(0) })
  const roll = new Map<string, Roll>()
  const get = (id: string) => { let r = roll.get(id); if (!r) { r = empty(); roll.set(id, r) } return r }

  const weekIdx = (d: Date | string) => { const i = Math.floor((now - +new Date(d)) / WEEK); return i >= 0 && i < 8 ? 7 - i : -1 }

  for (const t of tenants) get(t.id) // ensure every tenant present
  for (const u of users) { const r = get(u.tenantId); r.users++; if (u.lastLoginAt && now - +new Date(u.lastLoginAt) < WEEK) r.logins7d++; if (u.lastLoginAt) r.lastActiveAt = Math.max(r.lastActiveAt, +new Date(u.lastLoginAt)) }
  for (const j of jobs) { const r = get(j.tenantId); r.jobs++; if (j.status === 'ACTIVE') r.activeJobs++ }
  for (const c of candidates) { const r = get(c.tenantId); r.candidates++; if (+new Date(c.createdAt) >= +monthAgo) r.candidates30d++; r.lastActiveAt = Math.max(r.lastActiveAt, +new Date(c.createdAt)) }
  for (const iv of interviews) { const tid = iv.candidate?.tenantId; if (tid) get(tid).interviews++ }
  for (const d of deals) { const r = get(d.tenantId); r.deals++; if (!['Closed Won', 'Closed Lost'].includes(d.stage)) r.pipelineValue += d.value || 0 }
  for (const a of activities) { const tid = a.candidate?.tenantId; if (!tid) continue; const r = get(tid); r.events8w++; const wi = weekIdx(a.createdAt); if (wi >= 0) r.spark[wi]++; r.lastActiveAt = Math.max(r.lastActiveAt, +new Date(a.createdAt)) }
  for (const a of audit) { const r = get(a.tenantId); r.events8w++; const wi = weekIdx(a.createdAt); if (wi >= 0) r.spark[wi]++; r.lastActiveAt = Math.max(r.lastActiveAt, +new Date(a.createdAt)) }

  const tenantName = new Map(tenants.map((t) => [t.id, t]))
  const rows = tenants.map((t) => {
    const r = get(t.id)
    const trialDaysLeft = t.trialEndsAt ? Math.ceil((+new Date(t.trialEndsAt) - now) / DAY) : null
    return {
      id: t.id, name: t.name, type: t.type, plan: t.plan,
      status: t.subscriptionStatus === 'active' ? 'Paid' : (t.trialActive && (trialDaysLeft ?? 0) > 0 ? `Trial (${trialDaysLeft}d)` : t.subscriptionStatus === 'past_due' ? 'Past due' : 'Expired'),
      users: r.users, logins7d: r.logins7d, jobs: r.jobs, activeJobs: r.activeJobs,
      candidates: r.candidates, candidates30d: r.candidates30d, interviews: r.interviews,
      deals: r.deals, pipelineValue: Math.round(r.pipelineValue),
      events8w: r.events8w, spark: r.spark,
      lastActiveAt: r.lastActiveAt ? new Date(r.lastActiveAt).toISOString() : null,
      createdAt: t.createdAt,
    }
  }).sort((a, b) => (b.lastActiveAt ? +new Date(b.lastActiveAt) : 0) - (a.lastActiveAt ? +new Date(a.lastActiveAt) : 0))

  // Platform-wide KPIs.
  const activeTenants = rows.filter((r) => r.lastActiveAt && now - +new Date(r.lastActiveAt) < 30 * DAY).length
  const newThisMonth = tenants.filter((t) => +new Date(t.createdAt) >= +monthAgo).length
  const totals = {
    tenants: tenants.length,
    activeTenants,
    newTenantsThisMonth: newThisMonth,
    paying: rows.filter((r) => r.status === 'Paid').length,
    onTrial: rows.filter((r) => r.status.startsWith('Trial')).length,
    users: users.length,
    candidates: candidates.length,
    interviews: interviews.length,
    candidates30d: rows.reduce((s, r) => s + r.candidates30d, 0),
  }

  // Platform-wide activity over the last 8 weeks.
  const platformSpark = new Array(8).fill(0)
  for (const r of rows) r.spark.forEach((v, i) => { platformSpark[i] += v })

  // Feature usage — what actions clients actually take (last 8 weeks).
  const featureCounts: Record<string, number> = {}
  for (const a of activities) featureCounts[a.type] = (featureCounts[a.type] || 0) + 1
  for (const a of audit) featureCounts[a.action] = (featureCounts[a.action] || 0) + 1
  const featureUsage = Object.entries(featureCounts).map(([feature, count]) => ({ feature, count })).sort((a, b) => b.count - a.count).slice(0, 10)

  return NextResponse.json({ totals, rows, platformSpark, featureUsage, tenantCount: tenantName.size })
})
