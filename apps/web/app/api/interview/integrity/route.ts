import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeEvent } from '@/lib/screen/integrity/events'
import { summarizeIntegrity } from '@/lib/screen/integrity/summary'

export const dynamic = 'force-dynamic'

// ── Integrity event store (Build 01-A3, Screen-scoped) ─────────────────────
// Candidate-facing during the live interview (validated by interviewId, like
// the existing verification route). Persists structured event metadata only —
// NO raw frames. Flags route to human review; they never affect competency.

// POST — append a batch of captured events. Body: { interviewId, events: [...] }.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId : ''
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const interview = await prisma.interview.findUnique({ where: { id: interviewId }, select: { id: true } })
    if (!interview) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })

    const raw: unknown[] = Array.isArray(body.events) ? body.events : []
    const clean = raw.map(sanitizeEvent).filter((e): e is NonNullable<typeof e> => e !== null).slice(0, 200)
    if (clean.length === 0) return NextResponse.json({ ok: true, stored: 0 })

    await prisma.interviewIntegrityEvent.createMany({
      data: clean.map((e) => ({ interviewId, type: e.type, occurredAt: new Date(e.occurredAt), durationMs: e.durationMs ?? null, confidence: e.confidence ?? 1, detail: e.detail ?? null })),
    })
    return NextResponse.json({ ok: true, stored: clean.length })
  } catch (err) {
    console.error('[interview/integrity] POST error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to record integrity events' }, { status: 500 })
  }
}

// GET ?interviewId= — the computed integrity summary (review queue + report read).
export async function GET(req: NextRequest) {
  const interviewId = new URL(req.url).searchParams.get('interviewId') ?? ''
  if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })
  const events = await prisma.interviewIntegrityEvent.findMany({ where: { interviewId }, orderBy: { occurredAt: 'asc' } })
  return NextResponse.json({ summary: summarizeIntegrity(events) })
}
