import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signVoiceToken, voiceEligible } from '@/lib/screen/interview/voice-token'

export const dynamic = 'force-dynamic'

// POST /api/interview/voice-session  { interviewId } → { token, expiresAt }
// Exchanges the interview room's id for a short-lived voice token (see
// lib/screen/interview/voice-token.ts). Issued only while the interview is
// live, so the speech endpoint can't be used outside a real interview.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { interviewId?: unknown }
  const interviewId = typeof body.interviewId === 'string' ? body.interviewId.trim() : ''
  if (!interviewId || interviewId.length > 64) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

  const iv = await prisma.interview.findUnique({ where: { id: interviewId }, select: { status: true, completedAt: true } })
  if (!iv) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
  if (!voiceEligible(iv)) {
    console.warn(JSON.stringify({ evt: 'voice_session_refused', interviewId, status: iv.status }))
    return NextResponse.json({ error: 'This interview is not live' }, { status: 409 })
  }
  const { token, expiresAt } = signVoiceToken(interviewId)
  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() })
}
