import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — record a human approval of the question set. Body: { role: 'tech_lead' | 'hr' }.
// - single mode (default): one approval flips BOTH gates → Position 'active'.
// - dual mode: tech-lead + HR each approve; Position goes 'active' once both are in.
// Never auto-approves — this endpoint is only reached by an explicit human action.
export const POST = withHireAuth(async (req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const role: 'tech_lead' | 'hr' = body.role === 'hr' ? 'hr' : 'tech_lead'

  const map = await prisma.hireJobPositionMap.findUnique({ where: { hireJobId: job.id } })
  if (!map) return NextResponse.json({ error: 'Generate a question set first' }, { status: 400 })
  const position = await prisma.position.findUnique({ where: { id: map.positionId }, include: { questionSet: true } })
  if (!position?.questionSet) return NextResponse.json({ error: 'Generate a question set first' }, { status: 400 })

  const single = job.approvalMode !== 'dual'
  const data = single
    ? { techLeadApproved: true, hrApproved: true }
    : role === 'hr'
      ? { hrApproved: true }
      : { techLeadApproved: true }

  const updated = await prisma.position.update({ where: { id: position.id }, data })
  const bothApproved = updated.techLeadApproved && updated.hrApproved
  if (bothApproved && updated.status !== 'active') {
    await prisma.position.update({ where: { id: position.id }, data: { status: 'active' } })
  }

  // Audit: log the approval against the most recent candidate on the job (so it
  // appears in the job's activity), falling back to a tenant-level console log.
  const label = single ? 'Question set approved (single-approver)' : `Question set approved by ${role === 'hr' ? 'HR' : 'tech lead'}`
  const someCandidate = await prisma.hireCandidate.findFirst({ where: { tenantId: ctx.tenantId, jobId: job.id }, select: { id: true } })
  if (someCandidate) {
    await prisma.hireCandidateActivity.create({
      data: { candidateId: someCandidate.id, type: 'note', note: `${label} for "${job.title}"${bothApproved ? ' — AI interviews can now run.' : ''}`, userId: ctx.userId },
    }).catch(() => {})
  }
  console.log('[interview-questions/approve] job=%s role=%s mode=%s active=%s', job.id, role, single ? 'single' : 'dual', bothApproved)

  return NextResponse.json({
    techLeadApproved: updated.techLeadApproved,
    hrApproved: updated.hrApproved,
    state: bothApproved ? 'active' : 'pending_approval',
  })
})
