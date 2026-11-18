import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { generateWorkSampleTask } from '@/lib/screen/workspace/generate-task'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { bankTaskToWorkSample } from '@/lib/screen/taskbank/select'
import { TASK_WITH_RUBRIC } from '@/lib/screen/taskbank/store'
import { candidatesForPosition } from '@/lib/screen/taskbank/position-select'
import { DEFAULT_SOLVE_CONFIG } from '@/lib/screen/solve/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// ── Solve task — the SAME task pipeline as the Screen work sample ──────────
// POST { source: 'auto' }          best ACTIVE (human-reviewed) bank task, else a generated draft
// POST { source: 'bank', taskId }  a specific ACTIVE bank task
// POST { source: 'generate' }      AI draft from the JD, tests verified in Judge0 (NOT usable until approved)
// POST { source: 'screen' }        reuse the position's Screen work-sample task
// POST { approve: true }           approve the current draft
// Invites are blocked until the task is approved (same live-use gate as Screen).

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
  const current = await prisma.solveAssignment.findUnique({ where: { positionId: pos.id }, select: { task: true } })

  const save = async (task: unknown) => {
    await prisma.solveAssignment.upsert({
      where: { positionId: pos.id },
      update: { task: task as Prisma.InputJsonValue, updatedBy: access.session.email },
      create: { positionId: pos.id, agencyId, config: DEFAULT_SOLVE_CONFIG as unknown as Prisma.InputJsonValue, task: task as Prisma.InputJsonValue, updatedBy: access.session.email },
    })
    return task
  }

  if (body.approve === true) {
    const t = sanitizeTask(current?.task)
    if (!t) return NextResponse.json({ error: 'There is no task to approve.' }, { status: 400 })
    if (t.tests.length < 2) return NextResponse.json({ error: 'The task needs at least 2 test cases before it can be used.' }, { status: 400 })
    const task = await save({ ...t, approved: true, approvedBy: access.session.email })
    return NextResponse.json({ task, note: 'Approved — you can now send this take-home' })
  }

  if (body.source === 'screen') {
    const t = sanitizeTask(pos.workSampleTask)
    if (!t) return NextResponse.json({ error: 'This position has no Screen work-sample task yet.' }, { status: 400 })
    const task = await save(t)
    return NextResponse.json({ task, note: t.approved ? 'Using the Screen work-sample task' : 'Copied the Screen task — it is still a draft, approve it before sending' })
  }

  if (body.source === 'bank') {
    const id = typeof body.taskId === 'string' ? body.taskId : ''
    const b = await prisma.taskBankItem.findFirst({ where: { id, agencyId, status: 'active' }, include: TASK_WITH_RUBRIC })
    if (!b) return NextResponse.json({ error: 'Only active (human-reviewed) bank tasks can be used.' }, { status: 400 })
    const task = await save(bankTaskToWorkSample(b, { preferLanguage: null, approvedBy: `task bank (reviewed by ${b.reviewedBy ?? 'reviewer'})` }))
    return NextResponse.json({ task, note: `Using "${b.title}" from the task bank` })
  }

  if (body.source === 'auto') {
    const c = await candidatesForPosition(pos.id, agencyId)
    const best = c?.ranked.find((r) => r.score > 0)
    if (best) {
      const task = await save(bankTaskToWorkSample(best.task, { preferLanguage: null, approvedBy: 'task bank (reviewed)' }))
      return NextResponse.json({ task, note: `Selected "${best.task.title}" from the task bank` })
    }
    // fall through to a generated draft
  }

  const r = await generateWorkSampleTask(pos)
  if (!r.task) return NextResponse.json({ error: `Couldn't generate a task. ${r.note}.` }, { status: 502 })
  const task = await save(r.task)
  return NextResponse.json({ task, verified: r.verified, note: `${r.note}. Draft — review and approve before sending it` })
}
