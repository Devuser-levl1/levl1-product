import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sanitizeHeartbeat } from '@/lib/screen/control-room/live'

export const dynamic = 'force-dynamic'

// ── Candidate live heartbeat → Recruiter Control Room (Screen-scoped) ──────
// The interview page pushes its current presence snapshot every ~5s. We upsert
// ONE row per interview (no time series) so the control room can aggregate many
// live sessions with a single query. Validated by interviewId like the
// integrity-ingest route (the candidate has no recruiter session).
//
// Accepted only while the interview is live (or for a final beat right after it
// completes) so a stale tab can't resurrect a finished session.

const FINAL_GRACE_MS = 5 * 60_000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId.trim() : ''
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { status: true, completedAt: true, liveState: { select: { phase: true } } },
    })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const justEnded = interview.status === 'completed' && interview.completedAt
      && Date.now() - interview.completedAt.getTime() < FINAL_GRACE_MS
    if (interview.status !== 'in_progress' && !justEnded) {
      return NextResponse.json({ ok: false, reason: 'not_live' }, { status: 409 })
    }

    const now = new Date()
    const { state, transcript } = sanitizeHeartbeat(body, now)
    const phaseChanged = state.phase !== undefined && state.phase !== interview.liveState?.phase
    const data = { ...state, ...(phaseChanged ? { phaseSince: now } : {}) }

    await prisma.$transaction([
      prisma.interviewLiveState.upsert({
        where: { interviewId },
        update: data,
        create: { interviewId, ...data, phaseSince: now },
      }),
      // Full transcript (only sent when it grew) → the existing Interview.transcript
      // column, so session playback has the complete timestamped conversation.
      ...(transcript && transcript.length
        ? [prisma.interview.update({ where: { id: interviewId }, data: { transcript: transcript as unknown as Prisma.InputJsonValue } })]
        : []),
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[interview/live-heartbeat]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'heartbeat_failed' }, { status: 500 })
  }
}
