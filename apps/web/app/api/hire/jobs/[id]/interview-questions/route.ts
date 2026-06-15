import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SECTIONS = ['technicalQuestions', 'scenarioQuestions', 'behavioralQuestions', 'eqQuestions', 'whiteboardQuestions'] as const

// GET — current question set + approval state for the job's mapped Position.
// Returns { state, ... } where state is 'not_setup' | 'pending_approval' | 'active'.
export const GET = withHireAuth(async (_req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const map = await prisma.hireJobPositionMap.findUnique({ where: { hireJobId: job.id } })
  if (!map) return NextResponse.json({ state: 'not_setup', approvalMode: job.approvalMode, questionSet: null, techLeadApproved: false, hrApproved: false, positionStatus: null })

  const position = await prisma.position.findUnique({ where: { id: map.positionId }, include: { questionSet: true } })
  const approved = !!(position?.techLeadApproved && position?.hrApproved)
  const state = !position?.questionSet ? 'not_setup' : approved ? 'active' : 'pending_approval'

  return NextResponse.json({
    state,
    positionId: map.positionId,
    positionStatus: position?.status ?? null,
    approvalMode: job.approvalMode,
    techLeadApproved: !!position?.techLeadApproved,
    hrApproved: !!position?.hrApproved,
    questionSet: position?.questionSet ?? null,
  })
})

// PATCH — edit the question set (per-section reword/add/remove) and/or change the
// approvalMode. Non-destructive: it just updates the stored set.
export const PATCH = withHireAuth(async (req, ctx, params) => {
  const job = await prisma.hireJob.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({}))

  if (body.approvalMode === 'single' || body.approvalMode === 'dual') {
    await prisma.hireJob.update({ where: { id: job.id }, data: { approvalMode: body.approvalMode } })
  }

  const map = await prisma.hireJobPositionMap.findUnique({ where: { hireJobId: job.id } })
  if (body.questionSet && map) {
    const incoming = body.questionSet as Record<string, unknown>
    const data: Record<string, unknown> = {}
    for (const s of SECTIONS) if (Array.isArray(incoming[s])) data[s] = incoming[s]
    if (Object.keys(data).length > 0) {
      await prisma.questionSet.update({ where: { positionId: map.positionId }, data })
    }
  }

  const updatedJob = await prisma.hireJob.findUnique({ where: { id: job.id }, select: { approvalMode: true } })
  const questionSet = map ? await prisma.questionSet.findUnique({ where: { positionId: map.positionId } }) : null
  return NextResponse.json({ ok: true, approvalMode: updatedJob?.approvalMode, questionSet })
})
