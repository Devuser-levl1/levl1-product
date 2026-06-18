// Central Claude model id for the Screen live-interview BRAIN (conversation +
// per-turn evaluation). Kept SEPARATE from lib/ai/model.ts (CLAUDE_MODEL) so the
// premium interview tier can move independently of Hire / shared features.
//
// Build I-P0-3: upgraded the interview brain from claude-sonnet-4-6 to
// claude-opus-4-8 for sharper reasoning, better memory use, and smarter
// edge-case probing. Opus follows tangents more readily, so the follow-up depth
// cap (max 3 per question, enforced client-side) matters MORE with this model.
//
// NOTE: Opus 4.8 rejects `temperature`/`top_p`/`top_k` (400) — callers must not
// send them. Thinking is off unless explicitly enabled; for the latency-sensitive
// per-turn decision we keep it off and use low effort.
export const INTERVIEW_MODEL = 'claude-opus-4-8'
