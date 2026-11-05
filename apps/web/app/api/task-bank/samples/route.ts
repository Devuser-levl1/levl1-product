import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { loadSamples } from '@/lib/screen/taskbank/store'

export const dynamic = 'force-dynamic'

// POST — copy the SAMPLE tasks + skill maps into this agency (as drafts). Idempotent.
export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json(await loadSamples(access.session.agencyId, access.session.email))
}
