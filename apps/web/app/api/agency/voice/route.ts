import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { isVoiceKey } from '@/lib/screen/interviewer-voice'
import { DEFAULT_VOICE_KEY } from '@/lib/voiceOptions'

export const dynamic = 'force-dynamic'

// Account-level default interviewer voice (Agency.voiceAccent). Scoped to the
// caller's agency — this previously read/wrote prisma.agency.findFirst(), i.e.
// whichever account happened to be first, with no auth.

/** PATCH { voiceAccent } — set this account's default interviewer voice */
export async function PATCH(req: NextRequest) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  try {
    const { voiceAccent } = await req.json().catch(() => ({}))
    if (!isVoiceKey(voiceAccent)) return NextResponse.json({ error: 'Unknown voice' }, { status: 400 })
    const updated = await prisma.agency.update({ where: { id: access.session.agencyId }, data: { voiceAccent }, select: { voiceAccent: true } })
    return NextResponse.json({ voiceAccent: updated.voiceAccent })
  } catch (err) {
    console.error('agency voice PATCH error:', err)
    return NextResponse.json({ error: 'Failed to save voice setting' }, { status: 500 })
  }
}

/** GET — this account's current default interviewer voice */
export async function GET(req: NextRequest) {
  const access = recruiterAccess(req)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const agency = await prisma.agency.findUnique({ where: { id: access.session.agencyId }, select: { voiceAccent: true } }).catch(() => null)
  return NextResponse.json({ voiceAccent: isVoiceKey(agency?.voiceAccent) ? agency!.voiceAccent : DEFAULT_VOICE_KEY })
}
