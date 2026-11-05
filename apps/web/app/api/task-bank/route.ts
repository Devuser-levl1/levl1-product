import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeRubric, sanitizeTaskInput } from '@/lib/screen/taskbank/types'

export const dynamic = 'force-dynamic'

// GET  — the agency's task bank (list view; no reference solutions)
// POST — create a task (+ optional rubric). New tasks always start as DRAFT.
export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const rows = await prisma.taskBankItem.findMany({
    where: { agencyId: access.session.agencyId },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true, title: true, roles: true, skills: true, difficulty: true, experienceMin: true, experienceMax: true,
      languages: true, minutes: true, status: true, isSample: true, reviewedBy: true, reviewedAt: true, lastVerifiedAt: true,
      updatedAt: true, tests: true, rubric: { select: { probes: true, criteria: true } },
    },
  })
  return NextResponse.json(rows.map(({ tests, rubric, ...r }) => ({
    ...r,
    testCount: Array.isArray(tests) ? tests.length : 0,
    probeCount: Array.isArray(rubric?.probes) ? rubric!.probes.length : 0,
    criteriaCount: Array.isArray(rubric?.criteria) ? rubric!.criteria.length : 0,
  })))
}

export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const v = sanitizeTaskInput(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const rubric = sanitizeRubric(body.rubric)
  const t = v.task
  const row = await prisma.taskBankItem.create({
    data: {
      agencyId: access.session.agencyId, status: 'draft', createdBy: access.session.email,
      title: t.title, prompt: t.prompt, roles: t.roles, skills: t.skills, difficulty: t.difficulty,
      experienceMin: t.experienceMin, experienceMax: t.experienceMax, languages: t.languages,
      starterCode: t.starterCode as Prisma.InputJsonValue, tests: t.tests as unknown as Prisma.InputJsonValue,
      referenceSolution: t.referenceSolution || null, referenceLanguage: t.referenceLanguage, minutes: t.minutes,
      rubric: { create: { criteria: rubric.criteria as unknown as Prisma.InputJsonValue, probes: rubric.probes as unknown as Prisma.InputJsonValue } },
    },
    select: { id: true },
  })
  return NextResponse.json(row, { status: 201 })
}
