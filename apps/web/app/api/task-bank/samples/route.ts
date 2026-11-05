import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { loadStarterContent } from '@/lib/screen/taskbank/store'

export const dynamic = 'force-dynamic'

// POST — load / upgrade Levl1 starter content (tasks as drafts + role skill maps). Idempotent.
export async function POST(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json(await loadStarterContent(access.session.agencyId, access.session.email))
}
