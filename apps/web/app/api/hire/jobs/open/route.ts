import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { normalizeRole } from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

// Self-assign browse view (Team → Open jobs). Unlike GET /api/hire/jobs, this
// deliberately returns ALL open (ACTIVE) jobs in the tenant — NOT recruiter-
// scoped — so a recruiter can discover unowned work and claim it. Tenant-scoped
// and read-only; claiming happens via POST /api/hire/jobs/[id]/self-assign.
export const GET = withHireAuth(async (_req, ctx) => {
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, status: 'ACTIVE' },
    include: {
      _count: { select: { candidates: true } },
      client: { select: { id: true, name: true } },
      assignees: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Resolve assignee display names in one query.
  const assigneeIds = Array.from(new Set(jobs.map((j) => j.assigneeId).filter(Boolean) as string[]))
  const users = assigneeIds.length
    ? await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, id: { in: assigneeIds } }, select: { id: true, name: true } })
    : []
  const nameOf = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? null : null)

  const now = Date.now()
  const rows = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    clientName: j.client?.name ?? null,
    location: j.location ?? null,
    candidateCount: j._count.candidates,
    daysOpen: Math.max(0, Math.floor((now - new Date(j.createdAt).getTime()) / 86400000)),
    assigneeId: j.assigneeId,
    assigneeName: nameOf(j.assigneeId),
    mine: j.assigneeId === ctx.userId || j.assignees.some((a) => a.id === ctx.userId),
  }))

  // Viewers are read-only — they can browse but the client hides the claim button.
  return NextResponse.json({ jobs: rows, canSelfAssign: normalizeRole(ctx.role) !== 'VIEWER', meId: ctx.userId })
})
