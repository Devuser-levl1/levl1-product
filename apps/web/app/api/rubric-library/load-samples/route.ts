import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { loadSampleRubrics } from '@/lib/screen/rubrics/store'

export const dynamic = 'force-dynamic'

// POST — copy Levl1's SAMPLE rubrics into this workspace as drafts (admin).
// Idempotent; never touches anything already reviewed or edited.
export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { admin: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json(await loadSampleRubrics(access.session.agencyId, access.session.email))
}
