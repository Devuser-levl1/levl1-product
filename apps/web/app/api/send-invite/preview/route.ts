import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { buildInviteEmail } from '@/lib/screen/recruiter/invite-email'

export const dynamic = 'force-dynamic'

// POST — PREVIEW the candidate invite. Renders the exact email /api/send-invite
// would send (same template resolution + variable substitution) and returns it.
// Read-only: sends NOTHING (no email, no WhatsApp), creates no Interview record,
// and changes no candidate status. Fixpack 6 #1.
export async function POST(req: NextRequest) {
  try {
    const access = recruiterAccess(req)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const { agencyId } = access.session

    const body = await req.json().catch(() => ({})) as { candidateId?: string; candidateEmail?: string }
    if (!body.candidateId) return NextResponse.json({ error: 'candidateId required' }, { status: 400 })

    let candidate = await prisma.candidate.findFirst({
      where: { id: body.candidateId, position: { agencyId } },
      include: { position: true },
    })
    if (!candidate && body.candidateEmail) {
      candidate = await prisma.candidate.findFirst({
        where: { email: body.candidateEmail, position: { agencyId } },
        include: { position: true },
        orderBy: { uploadedAt: 'desc' },
      })
    }
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const agency = await prisma.agency.findUnique({ where: { id: agencyId } })
    if (!agency) return NextResponse.json({ error: 'Agency not found' }, { status: 404 })

    // Reuse the real interview id when one exists so links match what will be
    // sent; otherwise a placeholder — the preview never creates a record.
    const existing = await prisma.interview.findFirst({ where: { candidateId: candidate.id }, select: { id: true } })
    const email = buildInviteEmail({
      interviewId: existing?.id ?? 'preview',
      candidateName: candidate.name,
      position: candidate.position,
      agency,
    })

    return NextResponse.json({ to: candidate.email, subject: email.subject, html: email.html, preview: true })
  } catch (err) {
    console.error('[send-invite/preview] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Couldn\'t build the preview. Please try again.' }, { status: 500 })
  }
}
