// ── Solve captured-data notice (Screen-scoped, isomorphic) ─────────────────
// What the take-home captures, stated as facts that must stay true to code:
//   • code + work timeline (edits, runs, test results, paste SIZES — never
//     clipboard text — and how often the tab lost focus) — encrypted at rest
//     (lib/screen/privacy/fields.ts sealText / sealJson)
//   • NO camera, NO photo, NO audio recording. The defense conversation is
//     transcribed live by ElevenLabs (speech-to-text) and spoken by ElevenLabs
//     (interviewer voice); only the TEXT transcript is stored, encrypted.
//   • Anthropic evaluates the work and the conversation
//   • deleted SCREEN_TRANSCRIPT_RETENTION_DAYS after submission
//     (lib/screen/solve/sweep.ts); the evaluation report stays
// Change the copy in components/solve/SolveNotice.tsx and bump this version
// whenever any of that changes.
export const SOLVE_NOTICE_VERSION = '2026-11-18.1'
