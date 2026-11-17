// ── Interviewer voices (Screen) ─────────────────────────────────────────────
// The selector is AUTHORITATIVE: each option is one (name, accent) pair bound
// to one ElevenLabs voice ID, verified against the ElevenLabs API (voice name +
// accent/gender labels) on 2026-11-17. Selecting an option speaks with exactly
// that voice ID.
//
// History: until Fixpack 9 the labels were swapped — the "American English /
// Ananya" option played an INDIAN female voice (Diana) and "Indian English /
// Vikram" played an AMERICAN male voice (Adam). Keys were renamed so each label
// is honest; LEGACY keys stored on agencies/positions map to the voice those
// accounts were ACTUALLY hearing (so nobody's interviewer silently changes):
//   american → in_female (Ananya — the default every account had)
//   indian   → in_male   (Vikram — now a real Indian male voice)
//   british  → gb_male   (James — unchanged)

export interface VoiceOption {
  accent:      string       // display name
  key:         string       // stored in DB / URL param
  flag:        string       // region code (UI no longer renders emoji flags)
  voiceId:     string       // ElevenLabs voice ID (verified)
  elevenLabsName: string    // the ElevenLabs voice this ID is (for audits)
  gender:      'female' | 'male'
  description: string
  interviewerName: string   // what the AI introduces itself as
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    key: 'in_female', accent: 'Indian English', flag: 'IN', gender: 'female',
    voiceId: 'f0JpDwzbGK384Dd1WH2s', elevenLabsName: 'Diana – Friendly and Polished (indian, female)',
    description: 'Warm, polished Indian English', interviewerName: 'Ananya',
  },
  {
    key: 'in_male', accent: 'Indian English', flag: 'IN', gender: 'male',
    voiceId: 'A7AUsa1uITCDpK29MG3m', elevenLabsName: 'Ranbir M – Professional & Confident (indian, male)',
    description: 'Professional, confident Indian English', interviewerName: 'Vikram',
  },
  {
    key: 'us_female', accent: 'American English', flag: 'US', gender: 'female',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', elevenLabsName: 'Sarah – Mature, Reassuring, Confident (american, female)',
    description: 'Clear, reassuring American English', interviewerName: 'Sarah',
  },
  {
    key: 'gb_male', accent: 'British English', flag: 'GB', gender: 'male',
    voiceId: 'onwK4e9ZLuTAKqWW03F9', elevenLabsName: 'Daniel – Steady Broadcaster (british, male)',
    description: 'Professional British English', interviewerName: 'James',
  },
]

/** Old keys still stored in the database → the voice those accounts actually heard. */
export const LEGACY_VOICE_KEYS: Record<string, string> = { american: 'in_female', indian: 'in_male', british: 'gb_male' }

export const DEFAULT_VOICE_KEY = 'in_female'

/** Current key for any stored value (legacy keys mapped); null if unknown. */
export function normalizeVoiceKey(key?: string | null): string | null {
  if (!key) return null
  if (VOICE_OPTIONS.some((v) => v.key === key)) return key
  return LEGACY_VOICE_KEYS[key] ?? null
}

/** Look up a voice option by key (legacy keys accepted), falling back to the default. */
export function getVoiceOption(key?: string | null): VoiceOption {
  const k = normalizeVoiceKey(key) ?? DEFAULT_VOICE_KEY
  return VOICE_OPTIONS.find((v) => v.key === k) ?? VOICE_OPTIONS[0]
}

/** Get the ElevenLabs voice ID for a given key. */
export function getVoiceId(key?: string | null): string {
  return getVoiceOption(key).voiceId
}

/** Get the interviewer name for a given key. */
export function getInterviewerName(key?: string | null): string {
  return getVoiceOption(key).interviewerName
}
