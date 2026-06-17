// ── T2-2 Answer-latency anomaly detection (Screen-scoped, Build 02) ────────
// Flags timing patterns consistent with off-platform lookup. Conservative —
// high precision over recall — so isolated, explainable delays don't over-flag.
// Evidence-linked: every flag carries the measured timings + a rationale.

export interface LatencyInput {
  questionDifficulty?: 'easy' | 'medium' | 'hard' | null
  timeToFirstKeystrokeMs?: number | null  // question shown → first input
  idleBeforeAnswerMs?: number | null       // longest silent gap before the answer landed
  answerLength?: number                     // chars of the resulting answer
  precedingBlurMs?: number | null           // ms since a tab/window blur just before answering (Build 01 correlate)
}

export interface LatencyFlag {
  type: 'latency_anomaly'
  confidence: number
  rationale: string
  meta: Record<string, unknown>
}

// A "thinking" pause is normal; the tell is a LONG silent gap followed by a
// SUDDEN, fully-formed answer — especially right after leaving the window.
const LONG_GAP_MS = 20_000
const SUDDEN_ANSWER_CHARS = 200
const SLOW_START_BY_DIFFICULTY = { easy: 40_000, medium: 70_000, hard: 120_000 } as const

export function detectLatencyAnomaly(input: LatencyInput): LatencyFlag | null {
  const gap = input.idleBeforeAnswerMs ?? 0
  const len = input.answerLength ?? 0
  const ttfk = input.timeToFirstKeystrokeMs ?? 0
  const blur = input.precedingBlurMs ?? null

  // Pattern A — long silent gap → sudden complete answer.
  if (gap >= LONG_GAP_MS && len >= SUDDEN_ANSWER_CHARS) {
    let confidence = 0.6
    let rationale = `A ${(gap / 1000).toFixed(0)}s silent gap was followed by a fully-formed ${len}-character answer.`
    // Stronger when correlated with leaving the window just before (Build 01).
    if (blur != null && blur <= 5_000) {
      confidence = 0.82
      rationale += ` The candidate left the interview window ${(blur / 1000).toFixed(0)}s before answering.`
    }
    return { type: 'latency_anomaly', confidence, rationale, meta: { idleBeforeAnswerMs: gap, answerLength: len, precedingBlurMs: blur, pattern: 'gap_then_sudden_answer' } }
  }

  // Pattern B — time-to-first-keystroke wildly beyond what the difficulty warrants.
  const expected = SLOW_START_BY_DIFFICULTY[input.questionDifficulty ?? 'medium']
  if (ttfk >= expected && len >= SUDDEN_ANSWER_CHARS) {
    return {
      type: 'latency_anomaly',
      confidence: blur != null && blur <= 5_000 ? 0.7 : 0.55,
      rationale: `Time-to-first-input (${(ttfk / 1000).toFixed(0)}s) far exceeds the norm for a ${input.questionDifficulty ?? 'medium'} question, then a complete answer appeared.`,
      meta: { timeToFirstKeystrokeMs: ttfk, difficulty: input.questionDifficulty ?? 'medium', answerLength: len, precedingBlurMs: blur, pattern: 'slow_start_then_complete' },
    }
  }

  return null
}
