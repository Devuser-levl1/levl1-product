// ── Deliberate before responding (Screen-scoped, isomorphic) ───────────────
// ENGINE PRINCIPLE (see lib/screen/interview/principles.ts): before every
// interviewer turn the brain REASONS about the candidate's actual last answer —
// is it complete, what is the gap, is the candidate confident / thinking /
// stuck, what is the highest-signal next move — and only then decides.
//
// How: the deliberation is the FIRST field of the same JSON the brain already
// returns, so every decision field after it is conditioned on it. No second
// round-trip (that would add ~1s per turn and push the room toward its "voice
// reconnecting" path); the cost is ~30–60 output tokens. The hard rules still
// win: reconcileDecision() enforces the follow-up cap and makes the decision
// consistent with the reasoning. Stuck handling, termination/meta intents and
// barge-in stay in the room and are unchanged — deliberation improves the
// choice WITHIN those rules, it never removes them.

export const ANSWER_QUALITY = ['complete', 'partial', 'thin', 'off_topic', 'none'] as const
export const CANDIDATE_STATE = ['confident', 'thinking', 'stuck', 'unsure', 'meta'] as const
export const NEXT_MOVES = ['probe_gap', 'go_deeper', 'pivot', 'ease_off', 'move_on'] as const
export type AnswerQuality = (typeof ANSWER_QUALITY)[number]
export type CandidateState = (typeof CANDIDATE_STATE)[number]
export type NextMove = (typeof NEXT_MOVES)[number]

export interface Deliberation { answer: AnswerQuality; state: CandidateState; gap: string; move: NextMove; valid: boolean }

export const DELIBERATION_GUIDANCE =
  '\nDELIBERATE FIRST (internal — never spoken): before deciding, think about the candidate\'s ACTUAL words and fill "deliberation":\n' +
  '- answer: complete (covers what matters) | partial (right direction, gaps) | thin (vague, generic, no specifics) | off_topic | none (nothing evaluable).\n' +
  '- state: confident | thinking (working it out, give room) | stuck (not progressing) | unsure (hedging, guessing) | meta (asked to repeat, clarify, or about the process).\n' +
  '- gap: the single most important missing or unverified thing, in their terms. Empty if none.\n' +
  '- move — the HIGHEST-SIGNAL next step, not the easiest one:\n' +
  '  probe_gap (ask about the gap) | go_deeper (strong answer: test depth, an edge case, or how it played out) | pivot (same question, a different angle that reveals more) | ease_off (stuck: ONE simpler angle) | move_on (enough evidence, budget spent, or stuck after easing off).\n' +
  'Then make every decision field FOLLOW from it: shouldAskFollowUp is true only for probe_gap / go_deeper / pivot / ease_off, and the follow-up must target the gap or angle you named, anchored in their words. A stuck candidate gets at most one ease_off, then move_on. Never praise or grade aloud.\n\n'

const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null)

export function sanitizeDeliberation(raw: unknown, o: { answerEmpty: boolean }): Deliberation {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const answer = oneOf(d.answer, ANSWER_QUALITY)
  const state = oneOf(d.state, CANDIDATE_STATE)
  const move = oneOf(d.move, NEXT_MOVES)
  return {
    answer: o.answerEmpty ? 'none' : answer ?? 'partial',
    state: state ?? 'thinking',
    gap: typeof d.gap === 'string' ? d.gap.replace(/\s+/g, ' ').trim().slice(0, 140) : '',
    move: move ?? 'move_on',
    valid: !!(answer && state && move),
  }
}

const ASKS = new Set<NextMove>(['probe_gap', 'go_deeper', 'pivot', 'ease_off'])

/** Make the decision consistent with the deliberation and the hard rules. */
export function reconcileDecision(result: Record<string, unknown>, d: Deliberation, o: { followUpsLeft: number }): { result: Record<string, unknown>; changed: string[] } {
  const r = { ...result }
  const changed: string[] = []
  const q = typeof r.followUpQuestion === 'string' ? r.followUpQuestion.trim() : ''
  if (r.shouldAskFollowUp === true) {
    if (o.followUpsLeft <= 0) { r.shouldAskFollowUp = false; changed.push('budget_exhausted') }
    else if (d.valid && d.move === 'move_on') { r.shouldAskFollowUp = false; changed.push('deliberation_move_on') }
    else if (!q) { r.shouldAskFollowUp = false; changed.push('no_question_text') }
  } else if (d.valid && ASKS.has(d.move) && q && o.followUpsLeft > 0) {
    // Reasoned that a follow-up is the best move and wrote one, but forgot the flag.
    r.shouldAskFollowUp = true; changed.push('deliberation_asks')
  }
  if (r.shouldAskFollowUp !== true && 'followUpQuestion' in r) delete r.followUpQuestion
  return { result: r, changed }
}
