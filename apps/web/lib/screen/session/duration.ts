// ── Production interview duration (Screen-scoped) ──────────────────────────
// THE single source of truth for how long a real interview runs, and how that
// time is split between segments. Nothing else should hardcode a minute value.
//
// History: Build 06 = 30 min → Build 08 ~17–18 → 20 with logistics → back to
// 30 (logistics was eating Q&A time; the reclaimed time goes to depth Q&A).
//
// Configure (no code change):
//   SCREEN_PRODUCTION_INTERVIEW_MINUTES   server envelope (8–60, default 30)
//   NEXT_PUBLIC_SCREEN_INTERVIEW_MINUTES  same value for browser-only copy
//                                         (set both when overriding; the
//                                         interview room itself uses the
//                                         server value it receives)
//   SCREEN_LOGISTICS_MINUTES              logistics wall-clock budget (default 4)
//   SCREEN_CULTURE_FIT_MINUTES            Likert reserve (default 3)
// The envelope covers EVERYTHING — warm-up + logistics + Q&A + Likert. The
// time-up gate (single clean wrap-up) enforces it.
//
// IMPORTANT: production envelope only. NOT shared with the demo gallery
// (Build 05), whose short ~5–8 min taste lives in lib/screen/demo/personas.ts.
// Keep them decoupled — do not import one for the other.

const DEFAULT_MINUTES = 30
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const num = (v: string | undefined) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined }

export const PRODUCTION_INTERVIEW_MINUTES = Math.round(clamp(
  num(process.env.SCREEN_PRODUCTION_INTERVIEW_MINUTES) ?? num(process.env.NEXT_PUBLIC_SCREEN_INTERVIEW_MINUTES) ?? DEFAULT_MINUTES,
  8, 60,
))

// ── Segment budget ─────────────────────────────────────────────────────────
// Default 30-min split: ~1 warm-up · 4 logistics (+25 s per recruiter
// knockout, ~4–5 min total) · ~22 depth Q&A (4–5 questions, adaptive
// follow-ups, basic-concept + scenario mix) · 3 Likert culture-fit.
// Q&A gets whatever the other segments don't use.
export const WARMUP_SEGMENT_MINUTES = 1
export const LOGISTICS_SEGMENT_MINUTES = clamp(num(process.env.SCREEN_LOGISTICS_MINUTES) ?? 4, 1, 8)
export const CULTURE_FIT_SEGMENT_MINUTES = clamp(num(process.env.SCREEN_CULTURE_FIT_MINUTES) ?? 3, 1, 6)
export const QA_SEGMENT_MINUTES = Math.max(
  5, PRODUCTION_INTERVIEW_MINUTES - WARMUP_SEGMENT_MINUTES - LOGISTICS_SEGMENT_MINUTES - CULTURE_FIT_SEGMENT_MINUTES,
)

/**
 * Seconds that must remain on the clock to START another Q&A question; below
 * this the room moves on to the culture-fit segment so it is never squeezed
 * out by the time-up gate. = Likert reserve + ~1.5 min for a question's core
 * answer. Production only.
 */
export const CULTURE_FIT_RESERVE_SEC = Math.round(CULTURE_FIT_SEGMENT_MINUTES * 60)
export const MIN_QUESTION_SEC = 90

// The length a session actually runs. Production interviews ALWAYS use the
// envelope above — the per-position `interviewDuration` column is a legacy
// snapshot (18/20/30 on older rows) and is ignored for them. Demo-gallery runs
// keep their own short persona duration.
export function effectiveInterviewMinutes(position: { isDemo?: boolean | null; interviewDuration?: number | null } | null | undefined): number {
  if (position?.isDemo && position.interviewDuration) return position.interviewDuration
  return PRODUCTION_INTERVIEW_MINUTES
}
