import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { archiveAttempt, audit, linkKeyError, withKey } from '@/lib/screen/recovery/server'
import { canRetake, maxSelfRetakes, recoveryState, retakePolicy } from '@/lib/screen/recovery/state'

export const dynamic = 'force-dynamic'

// ── Candidate side of interview recovery (token-free, like the other candidate
// routes: validated by interviewId + the current link key) ──────────────────
// POST { interviewId, action, reason? }
//   report        the candidate came back to an interrupted interview — record
//                 what happened (optional reason) and tell the hiring team once
//   self_retake   only when SCREEN_RETAKE_POLICY=self: archive the interrupted
//                 attempt (kept for review) and start a fresh one
const REASONS = new Set(['browser', 'network', 'device', 'mic_camera', 'other'])
const REASON_LABEL: Record<string, string> = { browser: 'browser or computer crashed', network: 'internet connection dropped', device: 'device problem', mic_camera: 'microphone or camera problem', other: 'other' }

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const interviewId = typeof body.interviewId === 'string' ? body.interviewId.trim() : ''
    const action = body.action === 'self_retake' ? 'self_retake' : 'report'
    const reasonKey = typeof body.reason === 'string' && REASONS.has(body.reason) ? body.reason : null
    const reported = reasonKey ? REASON_LABEL[reasonKey] : null
    if (!interviewId) return NextResponse.json({ error: 'interviewId required' }, { status: 400 })

    const iv = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, status: true, terminationReason: true, startedAt: true, attempt: true, inviteKey: true, isDemo: true, candidate: { select: { name: true } }, position: { select: { id: true, agencyId: true, title: true } }, liveState: { select: { lastBeatAt: true } } },
    })
    if (!iv || iv.isDemo) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const keyErr = linkKeyError(iv.inviteKey, req)
    if (keyErr) return NextResponse.json(keyErr, { status: 410 })
    const state = recoveryState({ status: iv.status, terminationReason: iv.terminationReason, lastBeatAt: iv.liveState?.lastBeatAt, startedAt: iv.startedAt })
    if (!canRetake(state)) return NextResponse.json({ error: 'not_interrupted', state }, { status: 409 })

    if (action === 'self_retake') {
      const used = await prisma.interviewAttempt.count({ where: { interviewId: iv.id, retakeMode: 'self' } })
      if (retakePolicy() !== 'self' || used >= maxSelfRetakes()) return NextResponse.json({ error: 'needs_approval' }, { status: 403 })
      const r = await archiveAttempt(iv.id, { actor: 'candidate', mode: 'self', reason: 'Candidate restarted after an interruption', reported })
      return NextResponse.json({ ok: true, attempt: r?.attempt, next: withKey(`/candidate/schedule/${iv.id}`, iv.inviteKey) })
    }

    // report — once per attempt (a candidate may reload the page many times).
    const already = await prisma.interviewAuditEvent.findFirst({ where: { interviewId: iv.id, action: 'interrupted_reported', detail: { path: ['attempt'], equals: iv.attempt } }, select: { id: true } })
    if (!already) {
      await audit(iv.id, 'interrupted_reported', 'candidate', { attempt: iv.attempt, reason: reported })
      if (iv.position.agencyId) await prisma.notification.create({
        data: {
          agencyId: iv.position.agencyId, type: 'interview_interrupted', title: 'Interview interrupted',
          body: `${iv.candidate.name}'s interview for ${iv.position.title} didn't finish${reported ? ` (${reported})` : ''}. Review it and approve a retake if appropriate.`,
          link: `/positions/${iv.position.id}`,
        },
      }).catch(() => {})
    } else if (reported) {
      await audit(iv.id, 'interrupted_reported', 'candidate', { attempt: iv.attempt, reason: reported, update: true })
    }
    return NextResponse.json({ ok: true, notified: !already })
  } catch (err) {
    console.error('[interview/recovery] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not record that — please try again.' }, { status: 500 })
  }
}
