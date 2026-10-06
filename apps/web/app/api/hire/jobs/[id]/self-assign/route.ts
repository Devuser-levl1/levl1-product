import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { normalizeRole } from '@/lib/hire/permissions'

export const dynamic = 'force-dynamic'

// Self-assignment: a team member claims an open job for themselves. Distinct
// from the manager-only reassign on PATCH /api/hire/jobs/[id] — this only ever
// sets the assignee to the CALLER, so it needs no assign capability. Once set,
// the job (and its candidates, per candidateScope) become visible to them with
// no admin action. Tenant-scoped; ACTIVE jobs only; VIEWERs are read-only.
export const POST = withHireAuth(async (_req, ctx, params) => {
  if (normalizeRole(ctx.role) === 'VIEWER') {
    return NextResponse.json({ error: 'Viewers cannot take jobs.' }, { status: 403 })
  }

  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Only open (active) jobs can be self-assigned.' }, { status: 400 })
  }

  // Already mine → idempotent no-op (don't log a duplicate).
  if (job.assigneeId === ctx.userId) {
    return NextResponse.json({ ok: true, jobId: job.id, assigneeId: ctx.userId, alreadyMine: true })
  }

  const prevAssigneeId = job.assigneeId
  const updated = await prisma.hireJob.update({ where: { id: job.id }, data: { assigneeId: ctx.userId } })

  await logAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'job_self_assign',
    targetType: 'job',
    targetId: job.id,
    targetName: job.title,
    reason: prevAssigneeId ? 'Self-assigned (reassigned from another member)' : 'Self-assigned (was unassigned)',
    meta: { from: prevAssigneeId, to: ctx.userId },
  })

  return NextResponse.json({ ok: true, jobId: updated.id, assigneeId: ctx.userId })
})
