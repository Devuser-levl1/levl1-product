// ── Interviewer identity (Screen-scoped) ───────────────────────────────────
// SINGLE SOURCE OF TRUTH for the AI interviewer's name + default voice.
// Change the interviewer here (or via env) — no scattered string literals.

/**
 * The interviewer's display + spoken name. Used in the persona/opener, the UI
 * label, the auto-tour narration, and the transcript speaker tag.
 * Env-overridable (NEXT_PUBLIC_INTERVIEWER_NAME) for white-label, defaults to Ananya.
 */
export const INTERVIEWER_NAME =
  process.env.NEXT_PUBLIC_INTERVIEWER_NAME?.trim() || 'Ananya'

/**
 * Default ElevenLabs voice ID (female). The server env ELEVENLABS_VOICE_ID
 * (or a per-request voiceId / voiceAccent) overrides this; this is the
 * baked-in fallback so the female voice is active with no env set.
 */
export const DEFAULT_INTERVIEWER_VOICE_ID = 'f0JpDwzbGK384Dd1WH2s'
