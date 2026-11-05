import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { candidatesForPosition } from '@/lib/screen/taskbank/position-select'

export const dynamic = 'force-dynamic'

// GET — bank tasks ranked for this position, with the reasons for each score.
// Only ACTIVE (human-reviewed) tasks are selectable; ?all=1 also lists
// drafts/reviewed so recruiters see what is pending review.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const all = new URL(req.url).searchParams.get('all') === '1'
  const r = await candidatesForPosition(params.id, access.session.agencyId, { includeInactive: all })
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    role: r.role,
    candidates: r.ranked.slice(0, 15).map((x) => ({
      id: x.task.id, title: x.task.title, status: x.task.status, difficulty: x.task.difficulty, roles: x.task.roles,
      skills: x.task.skills, score: x.score, reasons: x.reasons, coversMustHaves: x.coversMustHaves, selectable: x.task.status === 'active',
    })),
  })
}
