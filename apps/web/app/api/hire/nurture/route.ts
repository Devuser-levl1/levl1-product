import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getScopes } from '@/lib/hire/scope'
import { isFlagged } from '@/lib/hire/nurture'

export const dynamic = 'force-dynamic'

// GET /api/hire/nurture — placed candidates + their check-in schedule/responses.
// Agency-only (gated by prefix in withHireAuth). Role-scoped: recruiters see the
// candidates they own; managers/admins see all. Filters: filter=upcoming|flagged,
// recruiterId.
export const GET = withHireAuth(async (req, ctx) => {
  const { candidate: scope } = await getScopes(ctx)
  const sp = new URL(req.url).searchParams
  const filter = sp.get('filter')
  const recruiterId = sp.get('recruiterId')

  const where: Prisma.HireCandidateWhereInput = {
    tenantId: ctx.tenantId,
    placedAt: { not: null },
    ...(recruiterId ? { assigneeId: recruiterId } : {}),
    AND: [scope as Prisma.HireCandidateWhereInput],
  }

  const rows = await prisma.hireCandidate.findMany({
    where,
    select: {
      id: true, name: true, email: true, phone: true, placedAt: true, placedCompany: true,
      assigneeId: true, nurtureOptOut: true,
      job: { select: { id: true, title: true, client: { select: { name: true } } } },
      nurtureCheckins: { orderBy: { dayOffset: 'asc' }, select: { id: true, dayOffset: true, scheduledFor: true, status: true, channel: true, sentAt: true, response: true, responseVia: true, respondedAt: true } },
    },
    orderBy: { placedAt: 'desc' },
    take: 500,
  })

  const users = await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId }, select: { id: true, name: true } })
  const nameById = new Map(users.map((u) => [u.id, u.name]))
  const now = Date.now()

  const candidates = rows.map((c) => {
    const next = c.nurtureCheckins.find((ci) => ci.status === 'scheduled')
    const flagged = c.nurtureCheckins.some((ci) => isFlagged(ci.response))
    return {
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      placedAt: c.placedAt, placedCompany: c.placedCompany ?? c.job?.client?.name ?? null,
      jobTitle: c.job?.title ?? null,
      recruiterId: c.assigneeId, recruiterName: c.assigneeId ? nameById.get(c.assigneeId) ?? '—' : 'Unassigned',
      nurtureOptOut: c.nurtureOptOut,
      nextCheckin: next ? { dayOffset: next.dayOffset, scheduledFor: next.scheduledFor } : null,
      flagged,
      checkins: c.nurtureCheckins,
    }
  })

  const filtered = filter === 'flagged' ? candidates.filter((c) => c.flagged)
    : filter === 'upcoming' ? candidates.filter((c) => c.nextCheckin && new Date(c.nextCheckin.scheduledFor).getTime() - now < 14 * 86400000)
    : candidates

  const summary = {
    placed: candidates.length,
    flagged: candidates.filter((c) => c.flagged).length,
    upcoming7d: candidates.filter((c) => c.nextCheckin && new Date(c.nextCheckin.scheduledFor).getTime() - now < 7 * 86400000).length,
    responded: candidates.reduce((n, c) => n + c.checkins.filter((x) => x.status === 'responded').length, 0),
  }

  return NextResponse.json({ candidates: filtered, summary, recruiters: users })
})
