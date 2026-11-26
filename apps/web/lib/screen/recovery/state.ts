// ── Interview recovery state (Screen-scoped, isomorphic, pure) ─────────────
// One place that decides what an interview's situation is and what may be
// done about it — the recruiter panel, the candidate pages and the room all
// read this, so they can never disagree.
//
//   not_started  invited / scheduled / pending — nothing captured yet
//   live         in progress, heartbeat fresh (another tab/device has it open)
//   interrupted  started but didn't finish cleanly: in progress with a stale
//                heartbeat, or swept to completed/ABANDONED
//   terminated   the candidate ended it early (TERMINATED_BY_CANDIDATE)
//   withdrawn    consent withdrawn — never retaken automatically
//   completed    finished normally
//   cancelled    cancelled / expired / no-show — resend reactivates it

export type RecoveryState = 'not_started' | 'live' | 'interrupted' | 'terminated' | 'withdrawn' | 'completed' | 'cancelled'

export interface StateInput {
  status: string
  terminationReason?: string | null
  lastBeatAt?: Date | string | null
  startedAt?: Date | string | null
}

/** No heartbeat for this long while "in progress" = the session is gone. */
export const LIVE_STALE_MS = 2 * 60_000

const ms = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : NaN)

export function recoveryState(iv: StateInput, now = Date.now()): RecoveryState {
  if (iv.status === 'in_progress') {
    const beat = ms(iv.lastBeatAt)
    const since = Number.isFinite(beat) ? beat : ms(iv.startedAt)
    return Number.isFinite(since) && now - since < LIVE_STALE_MS ? 'live' : 'interrupted'
  }
  if (iv.status === 'completed') {
    if (iv.terminationReason === 'ABANDONED') return 'interrupted'
    if (iv.terminationReason === 'TERMINATED_BY_CANDIDATE') return 'terminated'
    if (iv.terminationReason === 'CONSENT_WITHDRAWN') return 'withdrawn'
    return 'completed'
  }
  if (iv.status === 'cancelled' || iv.status === 'expired' || iv.status === 'no_show') return 'cancelled'
  return 'not_started'
}

// ── Policy (env, read at request time) ──────────────────────────────────────
// SCREEN_RETAKE_POLICY: who may issue a retake after a technical failure.
//   admin     (default) workspace admins approve
//   recruiter any recruiter who can edit
//   self      the candidate may restart once themselves (recruiters can too)
export type RetakePolicy = 'admin' | 'recruiter' | 'self'
export function retakePolicy(): RetakePolicy {
  const v = (process.env.SCREEN_RETAKE_POLICY ?? '').trim().toLowerCase()
  return v === 'recruiter' || v === 'self' ? v : 'admin'
}
const intEnv = (k: string, d: number, lo: number, hi: number) => {
  const n = Number(process.env[k]); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n) : d
}
/** How many times a candidate may move their own interview. */
export const maxReschedules = () => intEnv('SCREEN_MAX_RESCHEDULES', 3, 0, 20)
/** Self-serve restarts allowed per interview under the 'self' policy. */
export const maxSelfRetakes = () => intEnv('SCREEN_MAX_SELF_RETAKES', 1, 0, 3)

// ── What may be done ────────────────────────────────────────────────────────
/** Resend a fresh link: anything not yet taken (incl. cancelled/expired). */
export const canResend = (s: RecoveryState) => s === 'not_started' || s === 'cancelled'
/** Retake: only after a session that started and didn't finish cleanly. */
export const canRetake = (s: RecoveryState) => s === 'interrupted' || s === 'terminated'
/** Candidate reschedule: only before the interview has been started. */
export const canReschedule = (s: RecoveryState) => s === 'not_started'

export const STATE_LABEL: Record<RecoveryState, string> = {
  not_started: 'Not started', live: 'In progress', interrupted: 'Interrupted', terminated: 'Ended early by candidate',
  withdrawn: 'Consent withdrawn', completed: 'Completed', cancelled: 'Cancelled / expired',
}

// ── Link keys ───────────────────────────────────────────────────────────────
/** null inviteKey = legacy links (no key) stay valid. Otherwise the key must match. */
export function linkKeyOk(inviteKey: string | null | undefined, k: string | null | undefined): boolean {
  if (!inviteKey) return true
  return typeof k === 'string' && k === inviteKey
}
export const LINK_REPLACED_MESSAGE = 'This link has been replaced by a newer one. Please use the most recent link sent to you, or contact the hiring team.'

/** Candidate-facing URLs for an interview (with the key once one is set). */
export function candidateLinks(base: string, interviewId: string, inviteKey?: string | null) {
  const q = inviteKey ? `?k=${encodeURIComponent(inviteKey)}` : ''
  return {
    schedulingUrl: `${base}/schedule/${interviewId}${q}`,
    joinUrl: `${base}/interview/${interviewId}${q}`,
    rescheduleUrl: `${base}/candidate/schedule/${interviewId}${q}`,
  }
}

/** Plain-language failure reason from the last live signals (if any). */
export function inferFailureReason(live: { micOk?: boolean | null; camState?: string | null; sttWarning?: string | null; voiceWarning?: string | null; tabHidden?: boolean | null; lastBeatAt?: Date | string | null } | null | undefined, reported?: string | null): string | null {
  const parts: string[] = []
  if (reported) parts.push(`Candidate reported: ${reported}`)
  if (live) {
    if (live.micOk === false) parts.push('microphone unavailable')
    if (live.camState === 'denied') parts.push('camera denied')
    if (live.sttWarning) parts.push(`speech recognition: ${live.sttWarning}`)
    if (live.voiceWarning) parts.push(`interviewer voice: ${live.voiceWarning}`)
    if (live.tabHidden) parts.push('tab was hidden when the connection stopped')
    if (live.lastBeatAt) parts.push(`last signal ${new Date(live.lastBeatAt).toISOString()}`)
  }
  return parts.length ? parts.join('; ').slice(0, 1000) : null
}
