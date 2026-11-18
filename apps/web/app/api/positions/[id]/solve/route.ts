import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeTask } from '@/lib/screen/workspace/task'
import { DEFAULT_SOLVE_CONFIG, sanitizeSolveConfig } from '@/lib/screen/solve/config'
import { runSolveSweep } from '@/lib/screen/solve/sweep'

export const dynamic = 'force-dynamic'

// ── Solve (Stage 2) — per-position assignment ──────────────────────────────
// GET → { assignment: { enabled, config, task }, submissions: [...] , screenTask }
// PUT { enabled?, config? } → updated assignment
// Agency-scoped; the task (incl. hidden tests) is recruiter-only.

async function ownPosition(id: string, agencyId: string) {
  return prisma.position.findFirst({ where: { id, agencyId }, select: { id: true, workSampleTask: true } })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  const pos = await ownPosition(params.id, agencyId)
  if (!pos) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Opportunistic: settle deadlines / missing reports for this agency.
  await runSolveSweep({ agencyId, limit: 2 }).catch(() => null)

  const [a, subs, candidates] = await Promise.all([
    prisma.solveAssignment.findUnique({ where: { positionId: pos.id } }),
    prisma.solveSubmission.findMany({
      where: { positionId: pos.id, agencyId },
      select: {
        id: true, candidateId: true, status: true, invitedAt: true, expiresAt: true, startedAt: true, deadlineAt: true, submittedAt: true,
        autoSubmitted: true, submissionQuality: true, defenseStatus: true, defenseDeadlineAt: true, score: true, recommendation: true, reportStatus: true,
      },
    }),
    prisma.candidate.findMany({
      where: { positionId: pos.id },
      select: { id: true, name: true, email: true, status: true, score: true, recommendation: true, interview: { select: { status: true } } },
      orderBy: { uploadedAt: 'desc' },
    }),
  ])
  const byCandidate = new Map(subs.map((s) => [s.candidateId, s]))
  return NextResponse.json({
    assignment: a ? { enabled: a.enabled, config: sanitizeSolveConfig(a.config), task: a.task ?? null, updatedAt: a.updatedAt } : { enabled: false, config: DEFAULT_SOLVE_CONFIG, task: null, updatedAt: null },
    screenTask: sanitizeTask(pos.workSampleTask),
    canEdit: access.canEdit,
    candidates: candidates.map((c) => ({
      id: c.id, name: c.name, email: c.email,
      screen: { status: c.interview?.status ?? c.status, score: c.score, recommendation: c.recommendation },
      solve: byCandidate.get(c.id) ?? null,
    })),
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agencyId = access.session.agencyId
  const pos = await ownPosition(params.id, agencyId)
  if (!pos) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Validated at the boundary: enabled must be boolean; config goes through sanitizeSolveConfig.
  const body = await req.json().catch(() => null) as { enabled?: unknown; config?: unknown } | null
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled must be true or false' }, { status: 400 })
  if (body.config !== undefined && (typeof body.config !== 'object' || body.config === null || Array.isArray(body.config))) return NextResponse.json({ error: 'config must be an object' }, { status: 400 })
  const parsed = { data: { enabled: body.enabled as boolean | undefined, config: body.config as Record<string, unknown> | undefined } }

  const existing = await prisma.solveAssignment.findUnique({ where: { positionId: pos.id } })
  const config = sanitizeSolveConfig({ ...(existing ? sanitizeSolveConfig(existing.config) : DEFAULT_SOLVE_CONFIG), ...(parsed.data.config ?? {}) })
  const enabled = parsed.data.enabled ?? existing?.enabled ?? false
  const a = await prisma.solveAssignment.upsert({
    where: { positionId: pos.id },
    update: { enabled, config: config as unknown as Prisma.InputJsonValue, updatedBy: access.session.email },
    create: { positionId: pos.id, agencyId, enabled, config: config as unknown as Prisma.InputJsonValue, updatedBy: access.session.email },
  })
  return NextResponse.json({ assignment: { enabled: a.enabled, config, task: a.task ?? null, updatedAt: a.updatedAt } })
}
