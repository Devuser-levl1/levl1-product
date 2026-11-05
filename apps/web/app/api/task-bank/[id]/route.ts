import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeRubric, sanitizeTaskInput } from '@/lib/screen/taskbank/types'
import { TASK_WITH_RUBRIC } from '@/lib/screen/taskbank/store'

export const dynamic = 'force-dynamic'

async function owned(id: string, agencyId: string) {
  return prisma.taskBankItem.findFirst({ where: { id, agencyId }, include: TASK_WITH_RUBRIC })
}

// GET — full task incl. rubric + reference solution (recruiter-only).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const t = await owned(params.id, access.session.agencyId)
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(t)
}

// PATCH — edit content + rubric. Changing the content of a reviewed / active
// task sends it back to DRAFT: what was reviewed is no longer what is stored.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const t = await owned(params.id, access.session.agencyId)
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const v = sanitizeTaskInput(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const rubric = sanitizeRubric(body.rubric)
  const d = v.task
  const demote = t.status === 'reviewed' || t.status === 'active'
  const updated = await prisma.taskBankItem.update({
    where: { id: t.id },
    data: {
      title: d.title, prompt: d.prompt, roles: d.roles, skills: d.skills, difficulty: d.difficulty,
      experienceMin: d.experienceMin, experienceMax: d.experienceMax, languages: d.languages,
      starterCode: d.starterCode as Prisma.InputJsonValue, tests: d.tests as unknown as Prisma.InputJsonValue,
      referenceSolution: d.referenceSolution || null, referenceLanguage: d.referenceLanguage, minutes: d.minutes,
      lastVerifiedAt: null,
      ...(demote ? { status: 'draft', reviewedBy: null, reviewedAt: null } : {}),
      rubric: { upsert: {
        create: { criteria: rubric.criteria as unknown as Prisma.InputJsonValue, probes: rubric.probes as unknown as Prisma.InputJsonValue },
        update: { criteria: rubric.criteria as unknown as Prisma.InputJsonValue, probes: rubric.probes as unknown as Prisma.InputJsonValue },
      } },
    },
    include: TASK_WITH_RUBRIC,
  })
  return NextResponse.json({ ...updated, demoted: demote })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const t = await owned(params.id, access.session.agencyId)
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.taskBankItem.delete({ where: { id: t.id } })
  return NextResponse.json({ ok: true })
}
