import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { runSolveReport } from '@/lib/screen/solve/report'
import { applyTimeTransitions } from '@/lib/screen/solve/session'
import { SUBMISSION_VIEW_SELECT, buildSubmissionView } from '@/lib/screen/solve/view'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Recruiter view of one Solve submission (agency-scoped):
// GET  → report + the evidence behind it (code, tests, defense transcript, timeline moments)
// POST { action: 'retry_report' } → regenerate now (edit access)

async function load(id: string, agencyId: string) {
  return prisma.solveSubmission.findFirst({
    where: { id, agencyId },
    select: SUBMISSION_VIEW_SELECT,
  })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  let s = await load(params.id, access.session.agencyId)
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await applyTimeTransitions(s)
  s = (await load(params.id, access.session.agencyId))!
  return NextResponse.json(buildSubmissionView(s, access.canEdit))
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const s = await prisma.solveSubmission.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true, status: true, defenseStatus: true } })
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as { action?: unknown }
  if (body.action !== 'retry_report') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  if (!['submitted', 'completed'].includes(s.status) || ['pending', 'in_progress'].includes(s.defenseStatus)) return NextResponse.json({ error: 'The take-home isn\'t ready to evaluate yet.' }, { status: 409 })
  const ok = await runSolveReport(s.id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'The report couldn\'t be generated. Try again in a few minutes.' }, { status: 502 })
}
