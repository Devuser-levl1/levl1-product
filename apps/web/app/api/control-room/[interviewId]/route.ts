import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findScopedInterview, requireControlRoomSession } from '@/lib/screen/control-room/access'
import { deriveHealth, RECENT_WINDOW_MS } from '@/lib/screen/control-room/health'
import { HIGH_CONFIDENCE_TYPES, INTEGRITY_LABELS, IntegrityEventType } from '@/lib/screen/integrity/events'

export const dynamic = 'force-dynamic'

// ── Control Room drill-in: one live interview (Screen-scoped) ──────────────
// Current question, rolling transcript + interim line, live signal state and
// the latest integrity events. Agency-scoped; polled only while the drawer is open.

export async function GET(req: NextRequest, { params }: { params: { interviewId: string } }) {
  const session = requireControlRoomSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const interview = await findScopedInterview(params.interviewId, session.agencyId)
  if (!interview) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = Date.now()
  const [live, events, recording] = await Promise.all([
    prisma.interviewLiveState.findUnique({ where: { interviewId: interview.id } }),
    prisma.interviewIntegrityEvent.findMany({
      where: { interviewId: interview.id }, orderBy: { occurredAt: 'desc' }, take: 40,
      select: { id: true, type: true, occurredAt: true, confidence: true, detail: true, durationMs: true },
    }),
    prisma.interviewRecording.findUnique({ where: { interviewId: interview.id }, select: { id: true } }),
  ])

  const recent = new Map<string, number>()
  let totalFlags = 0
  for (const e of events) {
    if (HIGH_CONFIDENCE_TYPES.has(e.type as IntegrityEventType)) totalFlags++
    if (now - e.occurredAt.getTime() < RECENT_WINDOW_MS) recent.set(e.type, (recent.get(e.type) ?? 0) + 1)
  }
  const health = interview.status === 'in_progress'
    ? deriveHealth({ startedAt: interview.startedAt, live, now, totalFlags, recentFlags: Array.from(recent, ([type, count]) => ({ type, count })) })
    : null

  return NextResponse.json({
    serverTime: new Date(now).toISOString(),
    interview: {
      id: interview.id, status: interview.status, isDemo: interview.isDemo,
      startedAt: interview.startedAt, completedAt: interview.completedAt, plannedMinutes: interview.duration,
      terminationReason: interview.terminationReason,
      candidate: interview.candidate, position: interview.position,
      hasRecording: !!recording,
    },
    live: live && {
      lastBeatAt: live.lastBeatAt, phase: live.phase, phaseSince: live.phaseSince,
      questionIndex: live.questionIndex, questionCount: live.questionCount, questionText: live.questionText,
      camState: live.camState, faceCount: live.faceCount, sttMode: live.sttMode, micOk: live.micOk,
      sttWarning: live.sttWarning, lastSpeechAt: live.lastSpeechAt, tabHidden: live.tabHidden,
      transcriptTail: live.transcriptTail ?? [], interim: live.interim,
    },
    health,
    events: events.map((e) => ({
      ...e, label: INTEGRITY_LABELS[e.type as IntegrityEventType] ?? e.type,
      high: HIGH_CONFIDENCE_TYPES.has(e.type as IntegrityEventType),
    })),
  })
}
