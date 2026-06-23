import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Talent-pool growth stats for the dashboard widget: total, added this month,
// added last month (for a trend), and a breakdown by source.
export const GET = withHireAuth(async (_req, ctx) => {
  const t = ctx.tenantId
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [total, addedThisMonth, addedPrevMonth, bySourceRaw] = await Promise.all([
    prisma.hireCandidate.count({ where: { tenantId: t } }),
    prisma.hireCandidate.count({ where: { tenantId: t, createdAt: { gte: monthStart } } }),
    prisma.hireCandidate.count({ where: { tenantId: t, createdAt: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.hireCandidate.groupBy({ by: ['source'], where: { tenantId: t }, _count: { _all: true } }),
  ])

  const bySource = bySourceRaw
    .map((s) => ({ source: s.source ?? 'Unknown', count: s._count._all }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ total, addedThisMonth, addedPrevMonth, bySource })
})
