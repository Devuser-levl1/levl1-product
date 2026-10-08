import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Session recording retention for recruiter playback (Screen-scoped) ─────
// The interview page already records the candidate mic for fraud diarization;
// at the end it ALSO ships the same blob here so recruiters can replay the
// session. Covered by the existing consent ("recorded and monitored").
//
// Minimal retention: audio only, Postgres bytea (no object storage yet), hard
// size cap, auto-expiry (RECORDING_RETENTION_DAYS, default 90). One recording
// per interview; a re-upload replaces it. Validated by interviewId like the
// fraud-diarize route.

const MAX_BYTES = 25 * 1024 * 1024
const RETENTION_DAYS = Number(process.env.RECORDING_RETENTION_DAYS) || 90

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const interviewId = url.searchParams.get('interviewId')?.trim()
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })
    if (process.env.RECORDING_RETENTION_DISABLED === 'true') return NextResponse.json({ ok: true, stored: false })

    const interview = await prisma.interview.findUnique({ where: { id: interviewId }, select: { id: true, isDemo: true, consentGiven: true } })
    if (!interview) return NextResponse.json({ error: 'interview not found' }, { status: 404 })
    // Demo-gallery runs are anonymous throwaways — never retained.
    if (interview.isDemo) return NextResponse.json({ ok: true, stored: false, reason: 'demo' })
    if (!interview.consentGiven) return NextResponse.json({ ok: true, stored: false, reason: 'no_consent' })

    const startedAtRaw = url.searchParams.get('startedAt')
    const startedAt = startedAtRaw && !isNaN(Date.parse(startedAtRaw)) ? new Date(startedAtRaw) : null
    if (!startedAt) return NextResponse.json({ error: 'startedAt required' }, { status: 400 })
    const durationMs = Number(url.searchParams.get('durationMs')) || null

    const buf = Buffer.from(await req.arrayBuffer())
    if (!buf.byteLength) return NextResponse.json({ error: 'no audio' }, { status: 400 })
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: 'recording too large' }, { status: 413 })

    const mimeType = (req.headers.get('content-type') || 'audio/webm').split(';')[0].slice(0, 60)
    const expiresAt = new Date(Date.now() + RETENTION_DAYS * 86_400_000)
    const data = { mimeType, sizeBytes: buf.byteLength, data: buf, startedAt, durationMs, expiresAt }
    await prisma.interviewRecording.upsert({ where: { interviewId }, update: data, create: { interviewId, ...data } })

    // Opportunistic expiry sweep (cheap, indexed) — no cron needed.
    await prisma.interviewRecording.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})

    return NextResponse.json({ ok: true, stored: true, sizeBytes: buf.byteLength })
  } catch (err) {
    console.error('[interview/recording]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'recording_failed' }, { status: 500 })
  }
}
