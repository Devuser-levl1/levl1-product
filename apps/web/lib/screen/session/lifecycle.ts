// ── Interview session lifecycle (Screen-scoped, Build 01-B) ────────────────

// How a session actually ended. Persisted on Interview.terminationReason so the
// report can distinguish a real completion from an early/forced stop.
export const TERMINATION_REASONS = {
  COMPLETED: 'COMPLETED',                       // ran to the end normally
  TERMINATED_BY_CANDIDATE: 'TERMINATED_BY_CANDIDATE', // candidate asked to stop
  CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',       // hard stop — consent revoked
  ABANDONED: 'ABANDONED',                       // left / timed out without finishing
} as const
export type TerminationReason = (typeof TERMINATION_REASONS)[keyof typeof TERMINATION_REASONS]

// Explicit, ordered wrap-up states. The "any questions for us?" turn and the
// "thanks/goodbye" turn are DISTINCT states that cannot double-fire.
export type WrapUpState = 'active' | 'closing' | 'completed'

// A consent-withdrawn or candidate-terminated session must NOT be scored as a
// normal completion.
export function isScorableCompletion(reason: TerminationReason | null | undefined): boolean {
  return reason == null || reason === TERMINATION_REASONS.COMPLETED
}

// Tiny one-shot latch: guarantees a transition (e.g. wrap-up) runs exactly once,
// even under rapid re-entry before async state settles. Use a module/ref-held
// instance per session.
export function createOnceLatch() {
  let fired = false
  return {
    get fired() { return fired },
    // Returns true the FIRST time only; false on every subsequent call.
    tryFire(): boolean {
      if (fired) return false
      fired = true
      return true
    },
  }
}
