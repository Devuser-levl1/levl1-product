import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { RUBRIC_STATUSES, reviewReadiness, type RubricStatus } from '@/lib/screen/rubrics/types'
import { rowToContent } from '@/lib/screen/rubrics/store'

export const dynamic = 'force-dynamic'

// POST { status, note? } — the human-review gate (workspace admin).
//   draft → reviewed : reviewer note required + strong/weak anchors, ≥1 keyword, ≥1 probe
//   reviewed → active: becomes selectable for positions
//   any → retired / draft
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const r = await prisma.rubricLibraryItem.findFirst({ where: { id: params.id, agencyId: access.session.agencyId } })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json().catch(() => ({})) as { status?: unknown; note?: unknown }
  const status = body.status as RubricStatus
  if (!(RUBRIC_STATUSES as readonly string[]).includes(status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 })
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : ''

  if (status === 'reviewed') {
    if (!note) return NextResponse.json({ error: 'Add a review note: who reviewed it and what they checked.' }, { status: 400 })
    const gap = reviewReadiness(rowToContent(r))
    if (gap) return NextResponse.json({ error: gap }, { status: 400 })
  }
  if (status === 'active' && r.status !== 'reviewed' && r.status !== 'active') {
    return NextResponse.json({ error: 'Only reviewed rubrics can be activated.' }, { status: 400 })
  }
  const updated = await prisma.rubricLibraryItem.update({
    where: { id: r.id },
    data: {
      status,
      ...(status === 'reviewed' ? { reviewNote: note, reviewedBy: access.session.email, reviewedAt: new Date() } : {}),
      ...(status === 'draft' ? { reviewedBy: null, reviewedAt: null } : {}),
    },
    select: { id: true, status: true, reviewedBy: true, reviewedAt: true, reviewNote: true },
  })
  return NextResponse.json(updated)
}
