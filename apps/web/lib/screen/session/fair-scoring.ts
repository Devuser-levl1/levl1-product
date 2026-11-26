// ── Fair, accurate per-question scoring (Screen-scoped, isomorphic) ────────
// Real-transcript analysis (2026-11-26): rankings were right and nothing was
// inflated, but scores were systematically too HARSH for reasons that were the
// interviewer's fault, not the candidate's:
//   1. a clubbed two-part question scored as one wholesale miss
//   2. a correct-but-shallow answer ("items shouldn't sit in a status longer
//      than the SLA") scored 2/10 — graded against an ideal answer instead of
//      crediting what was said
//   3. a candid "I didn't own that" scored 1/10 with no probe of the adjacent
//      knowledge
// The goal is ACCURACY, not leniency: the spread should widen correctly (real
// partial knowledge rises to mid-scale; empty and wrong answers stay at the
// bottom; strong answers stay at the top).
//
// One rule set, used by BOTH scorers: the live evaluator (evaluate-response)
// and the final report (generate-report, SCORING_MODEL).

/** Shared scoring rules (prompt text). `scale` = how the score is expressed. */
export function fairScoringRules(scale: '0-10'): string {
  void scale
  return [
    'SCORING RULES — accurate, evidence-linked, neither harsh nor lenient:',
    '- Score what the candidate DEMONSTRATED, using the strongest REASONABLE reading of their actual words. If they named a correct concept, even briefly or in plain language, that is real evidence and earns partial credit. Do not grade against an ideal exhaustive answer and subtract everything missing.',
    '- Never credit what was not said: generic buzzwords without substance, restating the question, or confident claims with no correct content are NOT concepts. Do not infer knowledge from the resume or job title.',
    '- Keep "wrong / absent" and "correct but shallow" apart — they must never get the same low score. Scale (0-10):',
    '    0     no answer, or nothing relevant',
    '    1-2   incorrect, or only generic / irrelevant statements — no valid point at all',
    '    3     a fragment of a valid point (implied, partly right, or heavily prompted)',
    '    4-5   CORRECT BUT SHALLOW: at least one clearly valid, relevant point, with little depth or example — the middle of the scale, not the bottom',
    '    6-7   solid: several correct points, or one point handled with real depth / a concrete example',
    '    8-9   strong: correct, specific, well-reasoned, covers the important parts',
    '    10    exceptional: complete, precise, with trade-offs / edge cases / evidence of real ownership',
    '  Calibration: asked for the signals that WIP limits need tuning, "items shouldn\'t sit in a status longer than the SLA" clearly names one real signal (queue aging against SLA) with no depth → 4-5, NOT 1-3. A "3" is only for a point that is merely implied or half-right. Do not hold a correct point at 3 just because more is expected — that is what the follow-up is for.',
    '- MULTI-PART QUESTIONS: if the question (or what was asked across its follow-ups) has distinct parts, judge EACH part on its own merits and blend them, weighted by importance. A strong part must not be dragged to the floor by a weak or missed part — the score reflects the blend, never the minimum. A part that was never clearly asked on its own is weak evidence, not a failure of the whole question.',
    '- A QUESTION INCLUDES ITS FOLLOW-UPS: score the question on everything the candidate said across the original answer and every follow-up on it, using the best evidence. A follow-up answer that addresses the narrower thing it was asked is not marked down for not re-covering the whole original question.',
    '- ADMITTED GAPS: a candid "I did not own / was not directly involved in that" is not punished harder than a vague or bluffed answer. Credit the adjacent, applied knowledge shown (what they relied on it for, what broke when it was weak, how they worked with the owners). If, after a fair probe, the knowledge genuinely is not there, a low score is correct and defensible. A confident-but-generic bluff must never outscore a candid limitation plus real adjacent knowledge.',
    '- JUSTIFY FROM EVIDENCE: the note states FIRST what the candidate did demonstrate (quote or closely paraphrase), THEN the main gap. If you can name a valid point they made, the score is at least 3. If you cannot name anything valid, the score is at most 2. A note that only lists what is missing usually means the score is too harsh.',
  ].join('\n')
}

/**
 * Code-level consistency between a question score and its evidence (safety
 * net, both directions — accuracy, not leniency):
 *   • a correct point is listed as covered → not scored as "absent" (≥ 3/10)
 *   • nothing covered and gaps listed      → not scored as "solid"  (≤ 4/10)
 * Scores are 0-10 here; callers convert.
 */
export function reconcileQuestionScore(q: { score: number; keyPointsCovered?: unknown; keyPointsMissed?: unknown }): { score: number; adjusted: null | 'raised_covered_evidence' | 'capped_no_evidence' } {
  const real = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim().length > 2 && !/^(none|n\/?a|nothing|-)$/i.test(x.trim())) : [])
  const covered = real(q.keyPointsCovered).length
  const missed = real(q.keyPointsMissed).length
  const s = Math.max(0, Math.min(10, Number.isFinite(q.score) ? q.score : 0))
  if (covered > 0 && s < 3) return { score: 3, adjusted: 'raised_covered_evidence' }
  if (covered === 0 && missed > 0 && s > 4) return { score: 4, adjusted: 'capped_no_evidence' }
  return { score: s, adjusted: null }
}

// ── Admitted gaps: probe before scoring ─────────────────────────────────────
// Phrases where the candidate says they didn't do / own / know the thing.
const GAP_PATTERNS: RegExp[] = [
  /\b(don'?t|do not|didn'?t|did not|haven'?t|have not|never) (have|had|really have)? ?(any |much |direct )?(hands[- ]on )?experience\b/i,
  /\bno (real |direct |hands[- ]on |prior )?experience\b/i,
  /\b(haven'?t|have not|never|didn'?t|did not) (worked|work|used|use|done|do|set up|setup|built|build|owned|own|handled|handle|implemented|implement|configured|been involved)\b/i,
  /\b(wasn'?t|was not|weren'?t|were not|am not|i'?m not) (directly |really |personally )?(involved|responsible|part of|the (owner|one))\b/i,
  /\b(not|never) (directly |personally )?(my area|my responsibility|something i (owned|handled|did))\b/i,
  /\b(someone else|another team|the (tech|technical) leads?|release managers?|the (devops|platform|infra|qa) team|my (manager|lead)) (handled|did|owned|managed|took care of|set (it|that|them) up)\b/i,
  /\b(not familiar|unfamiliar) with\b/i,
  /\bi (don'?t|do not) know (much )?(about )?(that|this|it)\b/i,
]

/** Did the candidate admit they didn't own / haven't done the thing asked? */
export function admitsGap(text: string): boolean {
  const t = text.replace(/\s+/g, ' ')
  return GAP_PATTERNS.some((r) => r.test(t))
}

/** Fallback reframing probe (adjacent / applied knowledge), one question. */
export function reframeProbe(topic?: string): string {
  const what = topic && topic.trim() ? topic.trim().replace(/[?.]+$/, '') : 'that'
  return `That's fair, you didn't own ${what.length <= 40 ? what : 'that'} directly. From where you sat, how did it affect your work when it wasn't working well?`
}
