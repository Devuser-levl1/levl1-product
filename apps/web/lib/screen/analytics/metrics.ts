// ── Interview analytics aggregation (Screen-scoped, Build I-P0-2) ───────────
// Pure functions over rows already fetched (and pre-filtered: agency-scoped,
// isDemo=false) by the API route. No DB access here so it stays unit-testable.
//
// Honesty rules baked in:
//   • INSUFFICIENT_EVIDENCE reports are NEVER counted as fails — they are
//     excluded from pass/fail, score distribution and L2, and surfaced as their
//     own bucket so a non-engaged interview can't drag a real metric.
//   • Every rate ships with its sample size N so a 100% rate on N=2 reads honestly.

import { summarizeIntegrity, IntegrityEventRecord } from '../integrity/summary'

// Score at/above which a completed, evaluable interview counts as a pass.
export const PASS_THRESHOLD = Math.min(100, Math.max(0, Number(process.env.SCREEN_PASS_THRESHOLD ?? 60)))

const PASS_RECS = new Set(['yes', 'strong_yes'])

export interface ReportRow {
  overallScore: number
  recommendation: string
  insufficientEvidence: boolean
  l2ScoreThreshold: number // from the report's position
}

export interface InterviewRow {
  status: string
  terminationReason: string | null
  startedAt: Date | string | null
  actualDuration: number | null // minutes
}

export interface Rate {
  n: number
  count: number
  rate: number | null // 0..1, null when n === 0 (don't fabricate a rate)
}

const rate = (count: number, n: number): Rate => ({ n, count, rate: n > 0 ? count / n : null })

// ── 1. Pass/fail (evaluable reports only) ───────────────────────────────────
export function passFail(reports: ReportRow[]) {
  const evaluable = reports.filter((r) => !r.insufficientEvidence)
  const pass = evaluable.filter((r) => r.overallScore >= PASS_THRESHOLD).length
  return {
    threshold: PASS_THRESHOLD,
    pass,
    fail: evaluable.length - pass,
    insufficient: reports.length - evaluable.length, // separate bucket, not a fail
    ...rate(pass, evaluable.length),
  }
}

// ── 2. Score distribution (evaluable reports only) ──────────────────────────
const BUCKETS = [
  [0, 9], [10, 19], [20, 29], [30, 39], [40, 49],
  [50, 59], [60, 69], [70, 79], [80, 89], [90, 100],
] as const

export function scoreDistribution(reports: ReportRow[]) {
  const scores = reports.filter((r) => !r.insufficientEvidence).map((r) => r.overallScore)
  const buckets = BUCKETS.map(([lo, hi]) => ({
    label: `${lo}–${hi}`,
    lo,
    hi,
    count: scores.filter((s) => s >= lo && s <= hi).length,
  }))
  return { buckets, n: scores.length }
}

// ── 3. L2 advance rate (evaluable reports only) ─────────────────────────────
// Mirrors generate-report: advance = score ≥ position L2 threshold AND a
// positive recommendation. Recomputed here from persisted fields (deterministic).
export function l2AdvanceRate(reports: ReportRow[]) {
  const evaluable = reports.filter((r) => !r.insufficientEvidence)
  const advanced = evaluable.filter(
    (r) => r.overallScore >= r.l2ScoreThreshold && PASS_RECS.has(r.recommendation),
  ).length
  return rate(advanced, evaluable.length)
}

// ── 4. Completion rate (started interviews) ─────────────────────────────────
// Uses the conversation-hardening termination reasons. "Started" = the
// candidate actually began (startedAt set) OR the session reached a terminal
// reason — so never-joined no-shows don't deflate the denominator dishonestly.
export const TERMINATION_REASONS = [
  'COMPLETED', 'TERMINATED_BY_CANDIDATE', 'CONSENT_WITHDRAWN', 'ABANDONED',
] as const

export function completionRate(interviews: InterviewRow[]) {
  const started = interviews.filter((i) => i.startedAt != null || i.terminationReason != null || i.status === 'completed')
  const byReason: Record<string, number> = { COMPLETED: 0, TERMINATED_BY_CANDIDATE: 0, CONSENT_WITHDRAWN: 0, ABANDONED: 0 }
  let completed = 0
  for (const i of started) {
    const reason = i.terminationReason ?? (i.status === 'completed' ? 'COMPLETED' : 'ABANDONED')
    if (reason in byReason) byReason[reason] += 1
    else byReason.ABANDONED += 1
    if (reason === 'COMPLETED') completed += 1
  }
  return { byReason, ...rate(completed, started.length) }
}

// ── 5. Time-to-complete (completed interviews) ──────────────────────────────
export function timeToComplete(interviews: InterviewRow[]) {
  const durations = interviews
    .filter((i) => (i.terminationReason === 'COMPLETED' || i.status === 'completed') && typeof i.actualDuration === 'number' && i.actualDuration! > 0)
    .map((i) => i.actualDuration as number)
    .sort((a, b) => a - b)
  const n = durations.length
  if (n === 0) return { avgMin: null, medianMin: null, n }
  const avgMin = Math.round(durations.reduce((a, b) => a + b, 0) / n)
  const mid = Math.floor(n / 2)
  const medianMin = n % 2 ? durations[mid] : Math.round((durations[mid - 1] + durations[mid]) / 2)
  return { avgMin, medianMin, n }
}

// ── 6. Integrity-flag rate (per-interview review status) ────────────────────
// Source of truth is the event stream → summarizeIntegrity, the same model the
// report uses. Events are grouped by interview by the caller.
export function integrityFlagRate(eventsByInterview: Map<string, IntegrityEventRecord[]>, totalInterviews: number) {
  let flagged = 0
  for (const events of Array.from(eventsByInterview.values())) {
    if (summarizeIntegrity(events).reviewStatus === 'FLAGGED_FOR_REVIEW') flagged += 1
  }
  return rate(flagged, totalInterviews)
}
