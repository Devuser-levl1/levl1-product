import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findScopedInterview, requireControlRoomSession } from '@/lib/screen/control-room/access'
import { decryptString } from '@/lib/screen/privacy/crypto'
import { mediaExpired } from '@/lib/screen/privacy/retention'

export const dynamic = 'force-dynamic'

// ── Identity-verification photo (Screen-scoped, agency-gated) ──────────────
// The only place the candidate's photo is served. Signed-in members of the
// owning agency only; decrypted on the fly; never cached; refused once the
// media retention period has passed or consent was withdrawn (even if the
// purge hasn't run yet).

export async function GET(req: NextRequest, { params }: { params: { interviewId: string } }) {
  const session = requireControlRoomSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const scoped = await findScopedInterview(params.interviewId, session.agencyId)
  if (!scoped) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const iv = await prisma.interview.findUnique({
    where: { id: scoped.id },
    select: { completedAt: true, createdAt: true, consentWithdrawnAt: true, mediaPurgedAt: true, verification: { select: { photoUrl: true } } },
  })
  if (!iv?.verification?.photoUrl || mediaExpired(iv)) return NextResponse.json({ error: 'No photo' }, { status: 404 })

  const dataUrl = decryptString(iv.verification.photoUrl)
  const m = dataUrl?.match(/^data:(image\/jpeg);base64,(.+)$/)
  if (!m) return NextResponse.json({ error: 'Photo unavailable' }, { status: 500 })
  const bytes = Buffer.from(m[2], 'base64')
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: { 'Content-Type': m[1], 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
