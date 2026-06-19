// ── Production interview duration (Build 06 → Build 08, Screen-scoped) ──────
// THE single source of truth for how long a real interview runs.
//
// Build 08: shortened from 30 → ~17–18 min (depth Q&A + a short Likert culture-
// fit segment). Env-overridable (SCREEN_PRODUCTION_INTERVIEW_MINUTES) so an
// enterprise client can extend it (e.g. 20) without a code change. The envelope
// covers EVERYTHING — warm-up + Q&A + the Likert segment — never extend it to
// accommodate the warm-up.
//
// IMPORTANT: production envelope only. NOT shared with the demo gallery (Build
// 05), whose short ~5–8 min taste lives in lib/screen/demo/personas.ts. Keep
// them decoupled — do not import one for the other.
export const PRODUCTION_INTERVIEW_MINUTES =
  Math.max(8, Math.min(60, Number(process.env.SCREEN_PRODUCTION_INTERVIEW_MINUTES) || 18))

// Budget split (informational; the flow enforces the cap via the time-up gate).
// ~14–15 min depth Q&A (4–5 questions, full adaptive follow-ups) + ~2–3 min Likert.
export const QA_SEGMENT_MINUTES = 15
export const CULTURE_FIT_SEGMENT_MINUTES = 3
