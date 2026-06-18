// ── Production interview duration (Build 06, Screen-scoped) ────────────────
// THE single source of truth for how long a real interview runs. Fixed at 30
// minutes — a deliberate decision to reduce config surface (no 20/45/60 option).
//
// IMPORTANT: this is the PRODUCTION envelope only. It is intentionally NOT
// shared with the demo gallery (Build 05), whose short ~5–8 min taste lives in
// lib/screen/demo/personas.ts. Keep them decoupled — do not import one for the
// other. The warm-up (Build 03) fits INSIDE these 30 minutes; never extend the
// envelope to accommodate it.
export const PRODUCTION_INTERVIEW_MINUTES = 30
