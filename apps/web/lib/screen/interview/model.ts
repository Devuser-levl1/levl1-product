// Central Claude model ids for the Screen live-interview BRAIN. Kept SEPARATE
// from lib/ai/model.ts (CLAUDE_MODEL) so the interview tier moves independently
// of Hire / shared features.
//
// Brain split (carried over from the tuning decision):
//   • LIVE conversational turns (per-turn evaluation + dynamic question generation)
//     run on a FAST model so the candidate isn't kept waiting mid-interview.
//   • FINAL scoring / report runs on a DEEPER model for assessment quality.
//
// Env-overridable so the live tier can be retuned without a deploy.
export const LIVE_INTERVIEW_MODEL = process.env.SCREEN_LIVE_MODEL ?? 'claude-sonnet-4-6'
export const SCORING_MODEL        = process.env.SCREEN_SCORING_MODEL ?? 'claude-opus-4-8'

// Back-compat alias — existing live callers imported INTERVIEW_MODEL. It now
// points at the fast live model. (Opus 4.8 rejects temperature/top_p/top_k;
// sonnet-4-6 accepts them but callers here send none, so either is safe.)
export const INTERVIEW_MODEL = LIVE_INTERVIEW_MODEL
