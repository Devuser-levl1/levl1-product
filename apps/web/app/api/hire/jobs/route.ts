import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { checkAllowance } from '@/lib/hire/usage'
import { logAudit } from '@/lib/hire/audit'
import { assigneeScope } from '@/lib/hire/roles'

export const dynamic = 'force-dynamic'

const DEFAULT_STAGES = ['Sourced', 'Screening', 'Interview', 'Technical Round', 'HR Round', 'Offer', 'Hired']

export const GET = withHireAuth(async (_req, ctx) => {
  // Recruiters see only jobs assigned to them (or still unassigned); managers/admins see all.
  const jobs = await prisma.hireJob.findMany({
    where: { tenantId: ctx.tenantId, ...assigneeScope(ctx.role, ctx.userId) },
    include: {
      _count: { select: { candidates: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(jobs)
})

export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json()
  if (!body.title || !body.description) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
  }
  const stages = Array.isArray(body.stages) && body.stages.length >= 2 ? body.stages : DEFAULT_STAGES

  const allow = await checkAllowance(ctx.tenantId, 'job')
  if (!allow.allowed) return NextResponse.json({ error: allow.reason, message: allow.message, upgrade: true }, { status: 402 })

  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [])
  const job = await prisma.hireJob.create({
    data: {
      tenantId: ctx.tenantId,
      title: String(body.title),
      description: String(body.description),
      department: body.department ?? null,
      location: body.location ?? null,
      salaryMin: body.salaryMin != null ? Number(body.salaryMin) : null,
      salaryMax: body.salaryMax != null ? Number(body.salaryMax) : null,
      stages,
      status: 'ACTIVE',
      clientId: body.clientId || null,
      assigneeId: ctx.userId, // default the assignee to the creator

      // AI job-brief structured fields (P0-1) — power matching + scoring later.
      mustHaveSkills: arr(body.mustHaveSkills),
      niceToHaveSkills: arr(body.niceToHaveSkills),
      screeningCriteria: arr(body.screeningCriteria),
      interviewFocus: arr(body.interviewFocus),
      aiGenerated: body.aiGenerated === true,
    },
  })

  await logAudit({
    tenantId: ctx.tenantId, actorUserId: ctx.userId, action: 'job_create',
    targetType: 'job', targetId: job.id, targetName: job.title,
  })

  return NextResponse.json(job, { status: 201 })
})
