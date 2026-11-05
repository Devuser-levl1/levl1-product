import { NextRequest, NextResponse } from 'next/server'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { inviteMember } from '@/lib/screen/team/team'

export const dynamic = 'force-dynamic'

// POST { members: [{ email, name?, role }] } — invite teammates (ADMIN only).
// Business email required; invites go out via Resend; invitees accept, then
// sign in with the existing email-code (OTP) flow.
export async function POST(req: NextRequest) {
  try {
    const access = recruiterAccess(req, { admin: true })
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await req.json().catch(() => ({})) as { members?: unknown }
    const members = Array.isArray(body.members) ? body.members.slice(0, 20) : []
    if (!members.length) return NextResponse.json({ error: 'Add at least one email.' }, { status: 400 })

    const results = []
    for (const raw of members) {
      const m = (raw && typeof raw === 'object' ? raw : {}) as { email?: unknown; name?: unknown; role?: unknown }
      if (typeof m.email !== 'string' || !m.email.trim()) continue
      results.push(await inviteMember({
        agencyId: access.session.agencyId, inviterName: access.session.name,
        email: m.email, name: typeof m.name === 'string' ? m.name : undefined, role: m.role ?? 'recruiter',
      }))
    }
    const invited = results.filter((r) => r.ok).length
    const failed = results.filter((r): r is Extract<typeof r, { ok: false }> => !r.ok)
    if (!invited && failed.length) return NextResponse.json({ error: failed[0].error, results }, { status: 400 })
    return NextResponse.json({ success: true, invited, results })
  } catch (err) {
    console.error('[agency/invite-team]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Couldn\'t send the invite. Please try again.' }, { status: 500 })
  }
}
