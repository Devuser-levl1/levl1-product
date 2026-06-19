import { TERMINATION_REASONS, TerminationReason } from './lifecycle'

// ── Explicit termination-intent detection (Build 01-B1) ────────────────────
// Detects when a candidate explicitly asks to stop or withdraws consent, from
// the recognized transcript. Conservative phrase matching (high precision) — we
// confirm-and-end rather than guess, except for unambiguous consent withdrawal.

export type TerminationKind = 'end' | 'consent_withdrawal'
export interface TerminationDetection {
  kind: TerminationKind
  reason: TerminationReason
  // Unambiguous → end immediately; otherwise the interviewer confirms once.
  immediate: boolean
  matched: string
}

// Consent withdrawal = hard stop, never just a "are you sure?" — end immediately.
const CONSENT_WITHDRAWAL = [
  'withdraw my consent', 'withdraw consent', 'i do not consent', "i don't consent",
  'i no longer consent', 'revoke my consent', 'revoke consent', 'stop recording me',
  'i did not agree to be recorded', 'take back my consent',
]

const END_INTENT = [
  'end the interview', 'end this interview', 'stop the interview', 'stop this interview',
  'i want to stop', 'i want to end', 'i would like to stop', 'i would like to end',
  'please end this', 'please end the interview', 'please stop the interview',
  'can we stop', 'can we end', "let's stop", "let's end", 'i need to stop',
  'terminate the interview', 'i want to quit', 'i quit the interview',
  // Bug C: "close" / "wrap up" / "finish" framings were missing → real end
  // requests ("Can we close the interview, please?") were treated as answers.
  'close the interview', 'close this interview', 'can we close', "let's close",
  'i want to close', 'i would like to close', 'please close the interview',
  'wrap up the interview', 'wrap this up', 'can we wrap up', "let's wrap up",
  'finish the interview', 'finish this interview', 'finish my interview',
  'i want to finish', 'i would like to finish', 'can we finish the interview',
  'end it here', 'end now', 'end the call', 'i am done with the interview',
  "i'm done with the interview",
]

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Detect explicit termination intent in a candidate utterance.
 * Returns null when there is no clear intent (the interview continues).
 * `repeated` = the candidate has already been asked to confirm once, so a second
 * end-intent should end immediately rather than loop.
 */
export function detectTerminationIntent(text: string, opts: { repeated?: boolean } = {}): TerminationDetection | null {
  const t = norm(text)
  if (!t) return null

  for (const p of CONSENT_WITHDRAWAL) {
    if (t.includes(p)) return { kind: 'consent_withdrawal', reason: TERMINATION_REASONS.CONSENT_WITHDRAWN, immediate: true, matched: p }
  }
  for (const p of END_INTENT) {
    if (t.includes(p)) return { kind: 'end', reason: TERMINATION_REASONS.TERMINATED_BY_CANDIDATE, immediate: !!opts.repeated, matched: p }
  }
  return null
}
