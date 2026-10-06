import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit, resolveActorName } from '@/lib/hire/audit'
import { isManagerPlus } from '@/lib/hire/roles'
import { sendJobAssignedEmail } from '@/lib/hire/email'

export const dynamic = 'force-dynamic'

// Multi-assignment (tagging). Admin/Manager sets the FULL set of recruiters on a
// job. The lead (assigneeId) is kept in the set — if it was null or dropped, the
// first tagged recruiter becomes lead. Newly-added recruiters get an email.
export const PATCH = withHireAuth(async (req, ctx, params) => {
  if (!isManagerPlus(ctx.role)) return NextResponse.json({ error: 'Only managers can assign jobs.' }, { status: 403 })

  const job = await prisma.hireJob.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: { assignees: { select: { id: true } } },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const requested: string[] = Array.isArray(body.assigneeIds) ? body.assigneeIds.filter((x: unknown) => typeof x === 'string') : []

  // Only recruiters that belong to this tenant (and aren't disabled) are valid.
  const valid = await prisma.hireUser.findMany({
    where: { tenantId: ctx.tenantId, disabled: false, id: { in: requested } },
    select: { id: true, name: true, email: true },
  })
  const nextIds = valid.map((u) => u.id)
  const prevIds = job.assignees.map((a) => a.id)
  const added = nextIds.filter((id) => !prevIds.includes(id))

  // Keep a coherent lead: preserve it if still in the set, else the first tagged
  // recruiter, else null (fully unassigned).
  const lead = job.assigneeId && nextIds.includes(job.assigneeId) ? job.assigneeId : (nextIds[0] ?? null)

  await prisma.hireJob.update({
    where: { id: job.id },
    data: { assignees: { set: nextIds.map((id) => ({ id })) }, assigneeId: lead },
  })

  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'job_reassign',
    targetType: 'job', targetId: job.id, targetName: job.title,
    reason: `Assignees set to ${nextIds.length} recruiter${nextIds.length === 1 ? '' : 's'}`,
    meta: { assignees: nextIds, added, lead },
  })

  // Email the newly-added recruiters (best-effort, non-blocking of the response).
  if (added.length) {
    const byName = await resolveActorName(ctx.userId)
    const addedUsers = valid.filter((u) => added.includes(u.id))
    await Promise.all(addedUsers.map((u) => (u.email ? sendJobAssignedEmail(u.email, job.id, job.title, byName) : Promise.resolve())))
  }

  return NextResponse.json({ ok: true, jobId: job.id, assigneeIds: nextIds, leadId: lead, emailed: added.length })
})
