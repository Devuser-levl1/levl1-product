import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/hire/audit'
import { isManagerPlus } from '@/lib/hire/roles'

export const dynamic = 'force-dynamic'

export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({
    where: { id: params.id, tenantId: ctx.tenantId },
    include: {
      candidates: { select: { id: true, name: true, email: true, currentStage: true, aiScore: true, aiRecommendation: true, createdAt: true } },
      client: true,
      deals: { select: { id: true, title: true, value: true, stage: true, probability: true } },
    },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
})

export const PATCH = withHireAuth(async (req, ctx, params) => {
  const existing = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (typeof body.title === 'string') data.title = body.title
  if (typeof body.description === 'string') data.description = body.description
  if ('department' in body) data.department = body.department ?? null
  if ('location' in body) data.location = body.location ?? null
  if ('salaryMin' in body) data.salaryMin = body.salaryMin != null ? Number(body.salaryMin) : null
  if ('salaryMax' in body) data.salaryMax = body.salaryMax != null ? Number(body.salaryMax) : null
  if ('clientId' in body) data.clientId = body.clientId || null
  // AI job-brief structured fields (P0-1) — editable on the detail page.
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [])
  if ('mustHaveSkills' in body) data.mustHaveSkills = arr(body.mustHaveSkills)
  if ('niceToHaveSkills' in body) data.niceToHaveSkills = arr(body.niceToHaveSkills)
  if ('screeningCriteria' in body) data.screeningCriteria = arr(body.screeningCriteria)
  if ('interviewFocus' in body) data.interviewFocus = arr(body.interviewFocus)
  // Recruiter-defined weighted screening rubric: [{ skill, weight 1-5, required }].
  if ('rubric' in body) {
    data.rubric = Array.isArray(body.rubric)
      ? body.rubric
          .map((r: unknown) => {
            const o = (r ?? {}) as Record<string, unknown>
            const skill = typeof o.skill === 'string' ? o.skill.trim() : ''
            const weight = Math.max(1, Math.min(5, Math.round(Number(o.weight)) || 3))
            const cats = ['Technical', 'Domain', 'Tools', 'Soft']
            const category = cats.includes(o.category as string) ? (o.category as string) : undefined
            return { skill, weight, required: Boolean(o.required), ...(category ? { category } : {}) }
          })
          .filter((r: { skill: string }) => r.skill.length > 0)
      : []
  }
  if (['ACTIVE', 'PAUSED', 'CLOSED'].includes(body.status)) data.status = body.status
  if (typeof body.aiAutoAdvance === 'boolean') data.aiAutoAdvance = body.aiAutoAdvance
  if (body.aiAutoAdvanceThreshold != null) data.aiAutoAdvanceThreshold = Number(body.aiAutoAdvanceThreshold)
  if ('aiAutoAdvanceStage' in body) data.aiAutoAdvanceStage = body.aiAutoAdvanceStage || null
  if ('autoEmailStage' in body) data.autoEmailStage = body.autoEmailStage || null
  if ('autoEmailSubject' in body) data.autoEmailSubject = body.autoEmailSubject || null
  if ('autoEmailBody' in body) data.autoEmailBody = body.autoEmailBody || null

  if (Array.isArray(body.stages)) {
    if (body.stages.length < 2) {
      return NextResponse.json({ error: 'A pipeline needs at least 2 stages' }, { status: 400 })
    }
    // Reject if any candidate sits in a stage being removed.
    const candidates = await prisma.hireCandidate.findMany({
      where: { jobId: existing.id, tenantId: ctx.tenantId },
      select: { currentStage: true },
    })
    const removed = candidates.map((c) => c.currentStage).filter((s) => !body.stages.includes(s))
    if (removed.length > 0) {
      return NextResponse.json({ error: `Cannot remove stages with candidates in them: ${Array.from(new Set(removed)).join(', ')}` }, { status: 400 })
    }
    data.stages = body.stages
  }

  // Reassignment — managers/admins only. Logs a distinct audit entry + notifies.
  let reassigned: { from: string | null; to: string | null } | null = null
  if ('assigneeId' in body) {
    if (!isManagerPlus(ctx.role)) return NextResponse.json({ error: 'Only managers can reassign jobs.' }, { status: 403 })
    const to = body.assigneeId || null
    if (to !== existing.assigneeId) { data.assigneeId = to; reassigned = { from: existing.assigneeId, to } }
  }

  const job = await prisma.hireJob.update({ where: { id: existing.id }, data })

  if (reassigned) {
    const names = await prisma.hireUser.findMany({ where: { tenantId: ctx.tenantId, id: { in: [reassigned.from, reassigned.to].filter(Boolean) as string[] } }, select: { id: true, name: true, email: true } })
    const nm = (id: string | null) => (id ? names.find((u) => u.id === id)?.name ?? 'someone' : 'Unassigned')
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'job_reassign', targetType: 'job', targetId: job.id, targetName: job.title, reason: `Reassigned from ${nm(reassigned.from)} to ${nm(reassigned.to)}`, meta: { from: reassigned.from, to: reassigned.to } })
    // Notify the new assignee (best-effort).
    const toUser = names.find((u) => u.id === reassigned!.to)
    if (toUser?.email) {
      const { sendHireEmail } = await import('@/lib/hire/email')
      sendHireEmail({ to: toUser.email, subject: `A job was assigned to you: ${job.title}`, html: `<p>${job.title} has been assigned to you in Levl1 Hire.</p>` }).catch(() => {})
    }
  }

  // Rubric edits get their own audit entry; everything else is a job_update.
  if ('rubric' in body) {
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'rubric_change', targetType: 'rubric', targetId: job.id, targetName: job.title })
  }
  const nonRubricFields = Object.keys(data).filter((k) => k !== 'rubric' && k !== 'assigneeId')
  if (nonRubricFields.length > 0) {
    await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'job_update', targetType: 'job', targetId: job.id, targetName: job.title, meta: { fields: nonRubricFields } })
  }

  return NextResponse.json(job)
})

export const DELETE = withHireAuth(async (_req, ctx, params) => {
  const existing = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await logAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'job_delete', targetType: 'job', targetId: existing.id, targetName: existing.title })
  // Detach candidates, then delete the job.
  await prisma.hireCandidate.updateMany({ where: { jobId: existing.id }, data: { jobId: null } })
  await prisma.hireJob.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
})
