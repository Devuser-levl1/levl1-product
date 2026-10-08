import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireControlRoomSession } from '@/lib/screen/control-room/access'
import { deriveHealth, RECENT_WINDOW_MS } from '@/lib/screen/control-room/health'
import { HIGH_CONFIDENCE_TYPES, IntegrityEventType } from '@/lib/screen/integrity/events'

export const dynamic = 'force-dynamic'

// ── Recruiter Control Room — aggregated live view (Screen-scoped) ──────────
// ONE request returns every in-progress interview in the agency with its
// derived health, so the dashboard polls a single endpoint instead of N
// per-interview calls. Three queries total regardless of tile count:
//   1. live interviews + their 1:1 live-state row
//   2. integrity events grouped by (interview, type) — whole session
//   3. integrity events grouped by (interview, type) — recent window
// Demo-gallery interviews are excluded from the main list and returned
// separately (only when ?demo=1) so they never mix with real sessions.

// A session "in progress" for longer than this is an abandoned tab, not live.
const MAX_LIVE_AGE_MS = 3 * 60 * 60_000
const RECENT_ENDED_MS = 24 * 60 * 60_000
const HIGH_TYPES = Array.from(HIGH_CONFIDENCE_TYPES) as string[]

export async function GET(req: NextRequest) {
  const session = requireControlRoomSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const includeDemo = new URL(req.url).searchParams.get('demo') === '1'

  try {
    const now = Date.now()
    const scope = { position: { agencyId: session.agencyId } }

    const [interviews, recentlyEnded] = await Promise.all([
      prisma.interview.findMany({
        where: {
          ...scope,
          status: 'in_progress',
          startedAt: { gte: new Date(now - MAX_LIVE_AGE_MS) },
          ...(includeDemo ? {} : { isDemo: false }),
        },
        select: {
          id: true, isDemo: true, startedAt: true, duration: true,
          candidate: { select: { id: true, name: true } },
          position: { select: { id: true, title: true, company: true } },
          liveState: {
            select: {
              lastBeatAt: true, phase: true, phaseSince: true, questionIndex: true, questionCount: true,
              camState: true, faceCount: true, faceAbsentSince: true, multiFaceAt: true, sttMode: true,
              micOk: true, sttWarning: true, lastSpeechAt: true, tabHidden: true,
            },
          },
        },
        orderBy: { startedAt: 'asc' },
        take: 200,
      }),
      prisma.interview.findMany({
        where: { ...scope, isDemo: false, status: 'completed', completedAt: { gte: new Date(now - RECENT_ENDED_MS) } },
        select: {
          id: true, completedAt: true, terminationReason: true,
          candidate: { select: { name: true } },
          position: { select: { title: true, company: true } },
          recording: { select: { id: true } },
          _count: { select: { integrityEvents: true } },
        },
        orderBy: { completedAt: 'desc' },
        take: 12,
      }),
    ])

    const ids = interviews.map((i) => i.id)
    const [allFlags, recentFlags] = ids.length
      ? await Promise.all([
          prisma.interviewIntegrityEvent.groupBy({
            by: ['interviewId'], where: { interviewId: { in: ids }, type: { in: HIGH_TYPES } }, _count: { _all: true },
          }),
          prisma.interviewIntegrityEvent.groupBy({
            by: ['interviewId', 'type'],
            where: { interviewId: { in: ids }, occurredAt: { gte: new Date(now - RECENT_WINDOW_MS) } },
            _count: { _all: true },
          }),
        ])
      : [[], []]

    const totalBy = new Map(allFlags.map((g) => [g.interviewId, g._count._all]))
    const recentBy = new Map<string, { type: string; count: number }[]>()
    for (const g of recentFlags) {
      const list = recentBy.get(g.interviewId) ?? []
      list.push({ type: g.type, count: g._count._all })
      recentBy.set(g.interviewId, list)
    }

    const tiles = interviews.map((i) => {
      const health = deriveHealth({
        startedAt: i.startedAt, live: i.liveState, now,
        recentFlags: recentBy.get(i.id) ?? [], totalFlags: totalBy.get(i.id) ?? 0,
      })
      return {
        id: i.id,
        isDemo: i.isDemo,
        candidate: i.candidate.name,
        position: i.position.title,
        company: i.position.company,
        startedAt: i.startedAt,
        plannedMinutes: i.duration,
        phase: i.liveState?.phase ?? null,
        questionIndex: i.liveState?.questionIndex ?? null,
        questionCount: i.liveState?.questionCount ?? null,
        lastBeatAt: i.liveState?.lastBeatAt ?? null,
        totalFlags: totalBy.get(i.id) ?? 0,
        recentFlags: (recentBy.get(i.id) ?? []).filter((f) => HIGH_CONFIDENCE_TYPES.has(f.type as IntegrityEventType)).reduce((s, f) => s + f.count, 0),
        health,
      }
    })
    // Exception-first: worst first, then longest-running.
    tiles.sort((a, b) => b.health.severity - a.health.severity
      || new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime())

    const live = tiles.filter((t) => !t.isDemo)
    return NextResponse.json({
      serverTime: new Date(now).toISOString(),
      tiles: live,
      demoTiles: includeDemo ? tiles.filter((t) => t.isDemo) : [],
      counts: {
        live: live.length,
        alert: live.filter((t) => t.health.level === 'alert').length,
        watch: live.filter((t) => t.health.level === 'watch').length,
        ok: live.filter((t) => t.health.level === 'ok').length,
        humanPresent: live.filter((t) => t.health.presence === 'present').length,
      },
      recentlyEnded: recentlyEnded.map((r) => ({
        id: r.id, candidate: r.candidate.name, position: r.position.title, company: r.position.company,
        completedAt: r.completedAt, terminationReason: r.terminationReason,
        hasRecording: !!r.recording, integrityEvents: r._count.integrityEvents,
      })),
    })
  } catch (err) {
    console.error('[control-room] GET', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to load control room' }, { status: 500 })
  }
}
