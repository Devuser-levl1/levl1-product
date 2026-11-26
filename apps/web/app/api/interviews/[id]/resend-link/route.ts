import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { reissueLink } from '@/lib/screen/recovery/server'
import { sendResentInvite } from '@/lib/screen/recovery/notify'

export const dynamic = 'force-dynamic'

// POST — re-issue the candidate's link for the SAME pending interview (broken,
// expired or lost link). Older links stop working; a cancelled/expired
// interview is reactivated; scheduling and consent are unchanged (consent
// already given isn't asked again; if not, the new link still goes through it).
// Sent through the usual channels (email + WhatsApp). Logged with who/when.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  try {
    const r = await reissueLink(params.id, access.session.agencyId, access.session.email, 'resend')
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    const agency = r.interview.position.agency
    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })
    const sent = await sendResentInvite({ interviewId: r.interview.id, candidate: r.interview.candidate, position: r.interview.position, agency, links: r.links, inviteKey: r.inviteKey })
    return NextResponse.json({ ok: true, links: r.links, reactivated: r.reactivated, sent })
  } catch (err) {
    console.error('[interviews/resend-link] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not resend the link. Please try again.' }, { status: 500 })
  }
}
