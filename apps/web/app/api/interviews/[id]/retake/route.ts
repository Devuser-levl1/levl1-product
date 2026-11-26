import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { archiveAttempt, reissueLink } from '@/lib/screen/recovery/server'
import { sendRetakeInvite } from '@/lib/screen/recovery/notify'
import { canRetake, recoveryState, retakePolicy } from '@/lib/screen/recovery/state'

export const dynamic = 'force-dynamic'

// POST { reason } — approve a clean retake after a technical failure.
// The interrupted attempt is ARCHIVED (transcript, answers, media, report and
// its integrity events all kept and visible to reviewers); a fresh attempt
// supersedes it for scoring. Integrity history is never cleared, and the
// interrupted attempt is never auto-penalised. Who approved, when and why is
// recorded. SCREEN_RETAKE_POLICY decides who may approve (default: admins).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const policy = retakePolicy()
  const access = recruiterAccess(req, policy === 'admin' ? { admin: true } : { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.status === 403 && policy === 'admin' ? 'Only workspace admins can approve a retake.' : access.error }, { status: access.status })
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
    if (reason.length < 3) return NextResponse.json({ error: 'Add a short reason for the retake (it is kept with the record).' }, { status: 400 })

    const iv = await prisma.interview.findFirst({
      where: { id: params.id, position: { agencyId: access.session.agencyId }, isDemo: false },
      select: { id: true, status: true, terminationReason: true, startedAt: true, liveState: { select: { lastBeatAt: true } } },
    })
    if (!iv) return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    const state = recoveryState({ status: iv.status, terminationReason: iv.terminationReason, lastBeatAt: iv.liveState?.lastBeatAt, startedAt: iv.startedAt })
    if (!canRetake(state)) {
      return NextResponse.json({ error: state === 'live' ? 'The candidate is in the interview right now.' : state === 'withdrawn' ? 'The candidate withdrew consent — a retake cannot be issued.' : 'Only an interview that started and did not finish can be retaken.' }, { status: 409 })
    }

    const archived = await archiveAttempt(iv.id, { actor: access.session.email, mode: policy === 'admin' ? 'admin' : 'recruiter', reason })
    // Fresh link for the new attempt (older links stop working) + notify.
    const r = await reissueLink(iv.id, access.session.agencyId, access.session.email, 'retake')
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
    const agency = r.interview.position.agency
    const sent = agency ? await sendRetakeInvite({ interviewId: iv.id, candidate: r.interview.candidate, position: r.interview.position, agency, links: r.links }) : null
    return NextResponse.json({ ok: true, attempt: archived?.attempt, previous: archived, links: r.links, sent })
  } catch (err) {
    console.error('[interviews/retake] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not issue the retake. Please try again.' }, { status: 500 })
  }
}
