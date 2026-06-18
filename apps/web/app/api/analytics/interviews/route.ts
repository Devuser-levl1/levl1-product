import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import {
  passFail, scoreDistribution, l2AdvanceRate, completionRate, timeToComplete, integrityFlagRate,
  type ReportRow, type InterviewRow,
} from '@/lib/screen/analytics/metrics'
import type { IntegrityEventRecord } from '@/lib/screen/integrity/summary'

export const dynamic = 'force-dynamic'

// GET /api/analytics/interviews?positionId=&from=&to=
// Aggregate interview metrics for the caller's agency. Demo sessions are
// excluded everywhere (isDemo=false), consistent with Build 05.
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const agencyId = session.agencyId

    const sp = new URL(req.url).searchParams
    const positionId = sp.get('positionId')?.trim() || undefined
    const fromStr = sp.get('from')?.trim()
    const toStr = sp.get('to')?.trim()

    // Default window: last 90 days. Inclusive of the whole "to" day.
    const to = toStr ? new Date(`${toStr}T23:59:59.999Z`) : new Date()
    const from = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : new Date(to.getTime() - 90 * 24 * 3600_000)
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const positionWhere = { agencyId, isDemo: false, ...(positionId ? { id: positionId } : {}) }
    // Interview scope for completion/time/integrity: anything that ran in-window.
    const interviewScope = { isDemo: false, position: positionWhere, createdAt: { gte: from, lte: to } }
    // Report scope: completed interviews whose completion fell in-window.
    const reportScope = {
      candidate: {
        position: positionWhere,
        interview: { isDemo: false, status: 'completed', completedAt: { gte: from, lte: to } },
      },
    }

    const [reportRows, interviewRows, integrityRows] = await Promise.all([
      prisma.report.findMany({
        where: reportScope,
        select: {
          overallScore: true, recommendation: true, insufficientEvidence: true,
          candidate: { select: { position: { select: { l2ScoreThreshold: true } } } },
        },
      }),
      prisma.interview.findMany({
        where: interviewScope,
        select: { id: true, status: true, terminationReason: true, startedAt: true, actualDuration: true },
      }),
      prisma.interviewIntegrityEvent.findMany({
        where: { interview: interviewScope },
        select: { interviewId: true, type: true, occurredAt: true, durationMs: true, confidence: true, detail: true, meta: true },
      }),
    ])

    const reports: ReportRow[] = reportRows.map((r) => ({
      overallScore: r.overallScore,
      recommendation: r.recommendation,
      insufficientEvidence: r.insufficientEvidence,
      l2ScoreThreshold: r.candidate.position.l2ScoreThreshold,
    }))
    const interviews: InterviewRow[] = interviewRows.map((i) => ({
      status: i.status, terminationReason: i.terminationReason, startedAt: i.startedAt, actualDuration: i.actualDuration,
    }))

    // Group integrity events by interview for the per-session review verdict.
    const eventsByInterview = new Map<string, IntegrityEventRecord[]>()
    for (const e of integrityRows) {
      const list = eventsByInterview.get(e.interviewId) ?? []
      list.push({ type: e.type, occurredAt: e.occurredAt, durationMs: e.durationMs, confidence: e.confidence, detail: e.detail, meta: e.meta })
      eventsByInterview.set(e.interviewId, list)
    }
    const startedCount = interviews.filter((i) => i.startedAt != null || i.terminationReason != null || i.status === 'completed').length

    return NextResponse.json({
      filters: { positionId: positionId ?? null, from: from.toISOString(), to: to.toISOString() },
      passFail: passFail(reports),
      scoreDistribution: scoreDistribution(reports),
      l2: l2AdvanceRate(reports),
      completion: completionRate(interviews),
      timeToComplete: timeToComplete(interviews),
      integrity: integrityFlagRate(eventsByInterview, startedCount),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analytics query failed'
    console.error('[analytics/interviews]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
