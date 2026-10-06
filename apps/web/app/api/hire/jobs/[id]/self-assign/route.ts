import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit, resolveActorName } from '@/lib/hire/audit'
import { normalizeRole } from '@/lib/hire/permissions'
import { sendSelfAssignAdminEmail } from '@/lib/hire/email'

export const dynamic = 'force-dynamic'

// Self-assignment: a team member claims an open job for themselves. Distinct
// from the manager-only reassign on PATCH /api/hire/jobs/[id] — this only ever
// adds the CALLER, so it needs no assign capability. The caller joins the job's
// assignees (and becomes lead if it had none); the job + its candidates become
// visible to them with no admin action. Admins are emailed. Tenant-scoped;
// ACTIVE jobs only; VIEWERs are read-only.
export const POST = withHireAuth(async (_req, ctx, params) => {
  if (normalizeRole(ctx.role) === 'VIEWER') {
    return NextResponse.json({ error: 'Viewers cannot take jobs.' }, { status: 403 })
  }

  const job = await prisma.hireJob.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { assignees: { select: { id: true } } },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Only open (active) jobs can be self-assigned.' }, { status: 400 })
  }

  // Already on the job → idempotent no-op (don't log/email a duplicate).
  if (job.assigneeId === ctx.userId || job.assignees.some((a) => a.id === ctx.userId)) {
    return NextResponse.json({ ok: true, jobId: job.id, assigneeId: job.assigneeId, alreadyMine: true })
  }

  // Add the caller to the assignee set; take the lead only if the job had none.
  const lead = job.assigneeId ?? ctx.userId
  await prisma.hireJob.update({
    where: { id: job.id },
    data: { assignees: { connect: { id: ctx.userId } }, assigneeId: lead },
  })

  await logAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    action: 'job_self_assign',
    targetType: 'job',
    targetId: job.id,
    targetName: job.title,
    reason: job.assigneeId ? 'Self-assigned (joined as an additional recruiter)' : 'Self-assigned (was unassigned)',
    meta: { to: ctx.userId, lead },
  })

  // Notify all admins that a member took the job (best-effort).
  const [admins, actorName] = await Promise.all([
    prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, disabled: false, role: 'ADMIN' }, select: { email: true } }),
    resolveActorName(ctx.userId),
  ])
  await Promise.all(admins.map((a) => (a.email ? sendSelfAssignAdminEmail(a.email, job.id, job.title, actorName) : Promise.resolve())))

  return NextResponse.json({ ok: true, jobId: job.id, assigneeId: lead })
})
