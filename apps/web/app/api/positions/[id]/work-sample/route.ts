import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { ensureWorkSampleTask } from '@/lib/screen/workspace/ensure-task'
import { generateWorkSampleTask } from '@/lib/screen/workspace/generate-task'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { bankTaskToWorkSample } from '@/lib/screen/taskbank/select'
import { TASK_WITH_RUBRIC } from '@/lib/screen/taskbank/store'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST — set the position's work-sample task. Recruiter edit access, agency-scoped.
//   { source: 'auto' }               best ACTIVE bank task, else a generated draft
//   { source: 'bank', taskId }       a specific ACTIVE (human-reviewed) bank task
//   { source: 'generate' }           a fresh AI draft from the JD (NOT live until approved)
//   { approve: true }                approve the current generated draft for live use
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  const pos = await prisma.position.findFirst({
    where: { id: params.id, agencyId },
    select: { id: true, title: true, company: true, experienceLevel: true, techStack: true, jdText: true, primaryDomain: true, workSampleTask: true },
  })
  if (!pos) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const save = async (task: unknown) => {
    await prisma.position.update({ where: { id: pos.id }, data: { workSampleTask: task as Prisma.InputJsonValue } })
    return task
  }

  if (body.approve === true) {
    const t = sanitizeTask(pos.workSampleTask)
    if (!t) return NextResponse.json({ error: 'There is no task to approve.' }, { status: 400 })
    if (t.tests.length < 2) return NextResponse.json({ error: 'The task needs at least 2 test cases before it can be used.' }, { status: 400 })
    const task = await save({ ...t, approved: true, approvedBy: access.session.email })
    return NextResponse.json({ task, note: 'Approved for live interviews' })
  }

  if (body.source === 'bank') {
    const id = typeof body.taskId === 'string' ? body.taskId : ''
    const b = await prisma.taskBankItem.findFirst({ where: { id, agencyId, status: 'active' }, include: TASK_WITH_RUBRIC })
    if (!b) return NextResponse.json({ error: 'Only active (human-reviewed) bank tasks can be used.' }, { status: 400 })
    const task = await save(bankTaskToWorkSample(b, { preferLanguage: null, approvedBy: `task bank (reviewed by ${b.reviewedBy ?? 'reviewer'})` }))
    return NextResponse.json({ task, verified: !!b.lastVerifiedAt, note: `Using "${b.title}" from the task bank` })
  }

  if (body.source === 'generate') {
    const r = await generateWorkSampleTask(pos)
    if (!r.task) return NextResponse.json({ error: `Couldn't generate a task. ${r.note}.` }, { status: 502 })
    const task = await save(r.task)
    return NextResponse.json({ task, verified: r.verified, note: `${r.note}. Draft — review and approve before it is used live` })
  }

  const r = await ensureWorkSampleTask(pos.id, true)
  if (!r.ok) return NextResponse.json({ error: `Couldn't set a task. ${r.note}.` }, { status: 502 })
  const fresh = await prisma.position.findUnique({ where: { id: pos.id }, select: { workSampleTask: true } })
  return NextResponse.json({ task: fresh?.workSampleTask ?? null, verified: r.verified, note: r.note })
}
