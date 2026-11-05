import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeRubric, TASK_STATUSES, type TaskStatus } from '@/lib/screen/taskbank/types'
import { judge0Configured } from '@/lib/screen/workspace/judge0'

export const dynamic = 'force-dynamic'

// POST { status, note? } — the human-review gate.
//   draft → reviewed : a reviewer note is required, plus ≥2 tests and ≥1 rubric probe
//   reviewed → active: the reference solution must pass every test in Judge0
//                      (when execution is configured)
//   any → retired / draft
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const t = await prisma.taskBankItem.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, include: { rubric: true } })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const status = body.status as TaskStatus
  if (!(TASK_STATUSES as readonly string[]).includes(status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : ''

  if (status === 'reviewed') {
    const tests = Array.isArray(t.tests) ? t.tests.length : 0
    const probes = sanitizeRubric({ probes: t.rubric?.probes ?? [] }).probes.length
    if (!note) return NextResponse.json({ error: 'Add a review note: who reviewed it and what they checked.' }, { status: 400 })
    if (tests < 2) return NextResponse.json({ error: 'A reviewed task needs at least 2 test cases.' }, { status: 400 })
    if (!probes) return NextResponse.json({ error: 'Add at least one expected probe answer to the rubric, so the defense can be judged.' }, { status: 400 })
  }
  if (status === 'active') {
    if (t.status !== 'reviewed' && t.status !== 'active') return NextResponse.json({ error: 'Only reviewed tasks can be activated.' }, { status: 400 })
    if (judge0Configured() && !t.lastVerifiedAt) return NextResponse.json({ error: 'Run "Verify in Judge0" first — the reference solution must pass every test.' }, { status: 400 })
  }
  const updated = await prisma.taskBankItem.update({
    where: { id: t.id },
    data: {
      status,
      ...(status === 'reviewed' ? { reviewNote: note, reviewedBy: access.session.email, reviewedAt: new Date() } : {}),
      ...(status === 'draft' ? { reviewedBy: null, reviewedAt: null } : {}),
    },
    select: { id: true, status: true, reviewedBy: true, reviewedAt: true, reviewNote: true },
  })
  return NextResponse.json({ ...updated, unverified: status === 'active' && !judge0Configured() })
}
