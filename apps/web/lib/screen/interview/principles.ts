// ── Screen interview ENGINE PRINCIPLES (Screen-scoped) ─────────────────────
// These hold across every engine change (live brain, follow-ups, scoring,
// reports, Solve). A change that breaks one of them is a regression, even if
// tests pass. Referenced from the engine files; summarised in CLAUDE.md.
//
// 1. EVIDENCE — every score traces to evidence. Only credit what the candidate
//    said or did; cite it (quote, question, timeline moment M#, defense line
//    D#, AI exchange A#). No evidence → INSUFFICIENT_EVIDENCE, never a number.
//
// 2. DELIBERATE BEFORE RESPONDING — before each interviewer turn the brain
//    reasons over the candidate's ACTUAL last answer (complete? gap? stuck /
//    thinking / confident? highest-signal next move?) and the visible line is
//    conditioned on that reasoning (lib/screen/interview/deliberation.ts).
//    The real answer must reach that step — an empty answer is logged loudly
//    (evt brain_empty_answer), never silently evaluated as "".
//    Discipline still wins: ≤3 follow-ups per question, one ease-off when
//    stuck then move on, termination / meta intents, barge-in.
//
// 3. HONEST ABOUT UNCERTAINTY — every score carries a confidence (high /
//    medium / low), the LOWER of the model's judgment and what the evidence
//    can support (lib/screen/session/confidence.ts). Low confidence is shown
//    as "needs human review" with the reason, never as a precise number.
//    Graded extension of INSUFFICIENT_EVIDENCE: none < low < medium < high.
//
// 4. LOUD, NOT SILENT — when a dependency fails (AI brain, voice, STT, Judge0)
//    the engine says so (degraded flags, structured log events, Control Room),
//    and that uncertainty flows into confidence. It never fakes a result.
//
// 5. RESPONSIVE — deliberation lives inside the existing brain call (no extra
//    round-trip) and TTS stays streamed; no change may reintroduce latency that
//    pushes the room into its "voice reconnecting" path.

export const ENGINE_PRINCIPLES_VERSION = '2026-11-23'
