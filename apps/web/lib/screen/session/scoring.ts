// ── "Insufficient evidence" honesty (Build 01-B3, Screen-scoped) ───────────
// When a candidate never produced evaluable content, we must record
// INSUFFICIENT_EVIDENCE for that dimension rather than emitting a confident
// score (e.g. a clean 0/10 that reads like a real assessment).

export const INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE' as const

// Filler / non-answers that carry no evaluable signal.
const FILLER = new Set([
  'um', 'uh', 'erm', 'hmm', 'idk', 'dunno', 'pass', 'skip', 'no', 'nope', 'na', 'n/a',
  'i dont know', "i don't know", 'not sure', 'no idea', 'no comment', 'cant say', "can't say",
])

// A single response is non-evaluable when it's empty, pure filler, or too short
// to contain a substantive answer.
export function isNonEvaluableResponse(raw: string | null | undefined): boolean {
  if (!raw) return true
  const t = raw.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return true
  if (FILLER.has(t)) return true
  const words = t.split(' ').filter((w) => w.length > 1)
  return words.length < 4
}

export interface DimensionResponse { response?: string | null; answered?: boolean }

// A scored dimension/section has INSUFFICIENT_EVIDENCE when it received no
// evaluable responses at all (unanswered, only filler, or the interview ended
// before it was reached).
export function dimensionHasEvidence(responses: DimensionResponse[]): boolean {
  if (!responses || responses.length === 0) return false
  return responses.some((r) => r.answered !== false && !isNonEvaluableResponse(r.response))
}

export interface ScoredDimension {
  score: number | null
  outOf: number
  status: 'SCORED' | typeof INSUFFICIENT_EVIDENCE
}

// Build the persisted dimension result: a real score when there's evidence,
// otherwise the honest INSUFFICIENT_EVIDENCE marker (no fabricated number).
export function buildDimension(score: number, outOf: number, responses: DimensionResponse[]): ScoredDimension {
  if (!dimensionHasEvidence(responses)) return { score: null, outOf, status: INSUFFICIENT_EVIDENCE }
  return { score, outOf, status: 'SCORED' }
}

// Whole-interview gate: did the candidate engage at all?
export function interviewHasAnyEvidence(allResponses: DimensionResponse[]): boolean {
  return dimensionHasEvidence(allResponses)
}
