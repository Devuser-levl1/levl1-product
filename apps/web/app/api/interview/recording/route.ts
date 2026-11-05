import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptBytes } from '@/lib/screen/privacy/crypto'
import { readCapturePolicy } from '@/lib/screen/privacy/policy'
import { runRetentionPurge } from '@/lib/screen/privacy/retention'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Session recording retention for recruiter playback (Screen-scoped) ─────
// The interview page already records the candidate mic for fraud diarization;
// at the end it ALSO ships the same blob here so recruiters can replay the
// session. Requires the candidate's specific MEDIA consent (photo + audio +
// camera monitoring), and is refused once consent is withdrawn.
//
// Audio only, Postgres bytea (no object storage yet), hard size cap,
// AES-256-GCM encrypted before it is written (lib/screen/privacy/crypto.ts),
// auto-expiring after SCREEN_MEDIA_RETENTION_DAYS (lib/screen/privacy/policy.ts).
// One recording per interview; a re-upload replaces it. Validated by
// interviewId, and only accepted while the session is live or just ended.

const MAX_BYTES = 25 * 1024 * 1024
const UPLOAD_GRACE_MS = 15 * 60_000

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const interviewId = url.searchParams.get('interviewId')?.trim()
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })
    if (process.env.RECORDING_RETENTION_DISABLED === 'true') return NextResponse.json({ ok: true, stored: false })

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, isDemo: true, status: true, completedAt: true, consentGiven: true, mediaConsentGiven: true, consentWithdrawnAt: true },
    })
    if (!interview) return NextResponse.json({ error: 'interview not found' }, { status: 404 })
    // Demo-gallery runs are anonymous throwaways — never retained.
    if (interview.isDemo) return NextResponse.json({ ok: true, stored: false, reason: 'demo' })
    if (!interview.consentGiven || !interview.mediaConsentGiven || interview.consentWithdrawnAt) {
      return NextResponse.json({ ok: true, stored: false, reason: 'no_consent' })
    }
    const live = interview.status === 'in_progress'
      || (interview.status === 'completed' && (!interview.completedAt || Date.now() - interview.completedAt.getTime() < UPLOAD_GRACE_MS))
    if (!live) return NextResponse.json({ error: 'not_live' }, { status: 409 })

    const startedAtRaw = url.searchParams.get('startedAt')
    const startedAt = startedAtRaw && !isNaN(Date.parse(startedAtRaw)) ? new Date(startedAtRaw) : null
    if (!startedAt) return NextResponse.json({ error: 'startedAt required' }, { status: 400 })
    const durationMs = Number(url.searchParams.get('durationMs')) || null

    const buf = Buffer.from(await req.arrayBuffer())
    if (!buf.byteLength) return NextResponse.json({ error: 'no audio' }, { status: 400 })
    if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: 'recording too large' }, { status: 413 })

    const mimeType = (req.headers.get('content-type') || 'audio/webm').split(';')[0].slice(0, 60)
    const expiresAt = new Date(Date.now() + readCapturePolicy().mediaRetentionDays * 86_400_000)
    const data = { mimeType, sizeBytes: buf.byteLength, data: new Uint8Array(encryptBytes(buf)), startedAt, durationMs, expiresAt }
    await prisma.interviewRecording.upsert({ where: { interviewId }, update: data, create: { interviewId, ...data } })

    // Opportunistic retention purge (cheap, indexed) — the cron is the primary.
    void runRetentionPurge().catch((e) => console.warn('[interview/recording] retention purge failed:', e instanceof Error ? e.message : e))

    return NextResponse.json({ ok: true, stored: true, sizeBytes: buf.byteLength })
  } catch (err) {
    console.error('[interview/recording]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'recording_failed' }, { status: 500 })
  }
}
