import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findScopedInterview, requireControlRoomSession } from '@/lib/screen/control-room/access'
import { summarizeIntegrity } from '@/lib/screen/integrity/summary'

export const dynamic = 'force-dynamic'

// ── Session playback data (Screen-scoped) ──────────────────────────────────
// Everything the playback view needs to sync on ONE clock: the recording's
// wall-clock start, the full timestamped transcript, and every integrity event
// (with the existing review summary). The audio bytes stream from ./audio.

export async function GET(req: NextRequest, { params }: { params: { interviewId: string } }) {
  const session = requireControlRoomSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const interview = await findScopedInterview(params.interviewId, session.agencyId)
  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [recording, events] = await Promise.all([
    prisma.interviewRecording.findUnique({
      where: { interviewId: interview.id },
      select: { mimeType: true, sizeBytes: true, startedAt: true, durationMs: true, expiresAt: true },
    }),
    prisma.interviewIntegrityEvent.findMany({ where: { interviewId: interview.id }, orderBy: { occurredAt: 'asc' } }),
  ])
  const summary = summarizeIntegrity(events)

  return NextResponse.json({
    interview: {
      id: interview.id, status: interview.status, startedAt: interview.startedAt, completedAt: interview.completedAt,
      terminationReason: interview.terminationReason, candidate: interview.candidate, position: interview.position,
    },
    recording,
    transcript: Array.isArray(interview.transcript) ? interview.transcript : [],
    integrity: {
      reviewStatus: summary.reviewStatus, totalFlags: summary.totalFlags,
      events: summary.events.map((e, i) => ({ ...e, id: `ev_${i}` })),
    },
  })
}
