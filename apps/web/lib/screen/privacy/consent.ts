import { prisma } from '@/lib/prisma'
import { CAPTURE_NOTICE_VERSION, type ConsentKind } from './policy'

// ── Consent recording (Screen-scoped) ──────────────────────────────────────
// Two separate agreements, each logged with a timestamp + notice version:
//   'interview' — AI interview, responses recorded + evaluated (consentGiven)
//   'media'     — photo, audio recording, camera monitoring (mediaConsentGiven)
// The Interview flags keep the FIRST acknowledgement time; every
// acknowledgement is appended to InterviewConsentEvent (audit trail).

export type ConsentSurface = 'schedule' | 'join' | 'room'

export async function recordConsent(opts: {
  interviewId: string
  kind: ConsentKind
  surface: ConsentSurface
  userAgent?: string | null
}) {
  const iv = await prisma.interview.findUnique({
    where: { id: opts.interviewId },
    select: { id: true, consentGiven: true, consentGivenAt: true, mediaConsentGiven: true, mediaConsentAt: true },
  })
  if (!iv) return null
  const now = new Date()
  const data: Record<string, unknown> = {}
  if (opts.kind === 'interview' && !(iv.consentGiven && iv.consentGivenAt)) Object.assign(data, { consentGiven: true, consentGivenAt: now })
  if (opts.kind === 'media' && !(iv.mediaConsentGiven && iv.mediaConsentAt)) Object.assign(data, { mediaConsentGiven: true, mediaConsentAt: now, consentNoticeVersion: CAPTURE_NOTICE_VERSION })
  await prisma.$transaction([
    ...(Object.keys(data).length ? [prisma.interview.update({ where: { id: iv.id }, data })] : []),
    prisma.interviewConsentEvent.create({
      data: {
        interviewId: iv.id, kind: opts.kind, surface: opts.surface, noticeVersion: CAPTURE_NOTICE_VERSION,
        userAgent: opts.userAgent ? opts.userAgent.slice(0, 300) : null,
      },
    }),
  ])
  const at = opts.kind === 'media' ? (iv.mediaConsentAt ?? now) : (iv.consentGivenAt ?? now)
  console.info('[consent] acknowledged', JSON.stringify({ interviewId: iv.id, kind: opts.kind, surface: opts.surface, at: at.toISOString(), noticeVersion: CAPTURE_NOTICE_VERSION }))
  return { at }
}

/** Log a withdrawal (the room's end-by-termination path sets consentWithdrawnAt itself). */
export async function logWithdrawal(interviewId: string, userAgent?: string | null) {
  await prisma.interviewConsentEvent.create({
    data: { interviewId, kind: 'withdrawn', surface: 'room', noticeVersion: CAPTURE_NOTICE_VERSION, userAgent: userAgent?.slice(0, 300) ?? null },
  }).catch((e) => console.warn('[consent] withdrawal log failed:', e instanceof Error ? e.message : e))
}
