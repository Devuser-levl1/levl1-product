import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { proficiencyStatement, sanitizeRubricInput, RUBRIC_STATUSES } from '@/lib/screen/rubrics/types'
import { rowToContent } from '@/lib/screen/rubrics/store'

export const dynamic = 'force-dynamic'

// GET  ?q=&area=&status=   — the agency's rubric library (any member can browse).
//      status=selectable → only ACTIVE rubrics (the position selector).
// POST — create a rubric (workspace admin). New rubrics always start as DRAFT.
export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const sp = new URL(req.url).searchParams
  const q = sp.get('q')?.trim().slice(0, 80) ?? ''
  const area = sp.get('area')?.trim().slice(0, 80) ?? ''
  const status = sp.get('status') ?? ''
  const where: Prisma.RubricLibraryItemWhereInput = {
    agencyId: access.session.agencyId,
    ...(status === 'selectable' ? { status: 'active' } : (RUBRIC_STATUSES as readonly string[]).includes(status) ? { status } : {}),
    ...(area ? { area } : {}),
    ...(q ? { OR: [
      { subSkill: { contains: q, mode: 'insensitive' } }, { area: { contains: q, mode: 'insensitive' } },
      { proficientIn: { contains: q, mode: 'insensitive' } }, { ableTo: { contains: q, mode: 'insensitive' } },
      { keywords: { has: q } },
    ] } : {}),
  }
  const rows = await prisma.rubricLibraryItem.findMany({ where, orderBy: [{ area: 'asc' }, { subSkill: 'asc' }], take: 500 })
  return NextResponse.json({
    canEdit: access.isAdmin,
    items: rows.map((r) => {
      const c = rowToContent(r)
      return { ...c, statement: proficiencyStatement(c), status: r.status, isSample: r.isSample, reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt, reviewNote: r.reviewNote, updatedAt: r.updatedAt }
    }),
  })
}

export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const v = sanitizeRubricInput(await req.json().catch(() => ({})))
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const row = await prisma.rubricLibraryItem.create({
    data: { ...v.rubric, probes: v.rubric.probes as unknown as Prisma.InputJsonValue, agencyId: access.session.agencyId, status: 'draft', createdBy: access.session.email },
    select: { id: true },
  })
  return NextResponse.json(row, { status: 201 })
}
