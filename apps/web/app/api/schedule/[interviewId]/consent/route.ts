import { NextRequest, NextResponse } from 'next/server'
import { recordConsent, type ConsentSurface } from '@/lib/screen/privacy/consent'

export const dynamic = 'force-dynamic'

/**
 * Record a candidate's consent. Token-free (candidate facing) — validated by
 * interviewId only. Body (optional): { kind, surface }
 *   kind 'interview' (default) — AI interview; responses recorded + evaluated.
 *                                Required before the slot picker is shown.
 *   kind 'media'               — the SEPARATE captured-data consent: photo,
 *                                audio recording, camera monitoring. Required
 *                                before any capture and before the session can start.
 * The first acknowledgement time is kept on the Interview; every
 * acknowledgement is appended to InterviewConsentEvent with the notice version.
 */
const SURFACES = new Set<ConsentSurface>(['schedule', 'join', 'room'])

export async function POST(req: NextRequest, { params }: { params: { interviewId: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const kind = body.kind === 'media' ? 'media' : 'interview'
    const surface = SURFACES.has(body.surface as ConsentSurface) ? (body.surface as ConsentSurface) : 'schedule'
    const r = await recordConsent({ interviewId: params.interviewId, kind, surface, userAgent: req.headers.get('user-agent') })
    if (!r) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    return NextResponse.json({ ok: true, kind, ...(kind === 'media' ? { mediaConsentAt: r.at.toISOString() } : { consentGivenAt: r.at.toISOString() }) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record consent'
    console.error('[schedule/consent] error:', msg)
    return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 })
  }
}
