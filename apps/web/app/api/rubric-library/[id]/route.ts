import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { sanitizeRubricInput } from '@/lib/screen/rubrics/types'

export const dynamic = 'force-dynamic'

// PATCH — edit a rubric (workspace admin). Editing the CONTENT of a reviewed or
// active rubric sends it back to DRAFT: changed content must be re-reviewed.
// Positions that already selected it keep their reviewed snapshot.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const existing = await prisma.rubricLibraryItem.findFirst({ where: { id: params.id, agencyId: access.session.agencyId }, select: { id: true, status: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const v = sanitizeRubricInput(await req.json().catch(() => ({})))
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  const needsReReview = existing.status === 'reviewed' || existing.status === 'active'
  const row = await prisma.rubricLibraryItem.update({
    where: { id: existing.id },
    data: {
      ...v.rubric, probes: v.rubric.probes as unknown as Prisma.InputJsonValue,
      ...(needsReReview ? { status: 'draft', reviewedBy: null, reviewedAt: null } : {}),
    },
    select: { id: true, status: true },
  })
  return NextResponse.json({ ...row, sentBackToDraft: needsReReview })
}
