export interface VoiceOption {
  accent:      string       // display name
  key:         string       // stored in DB / URL param
  flag:        string
  voiceId:     string       // ElevenLabs voice ID
  description: string
  interviewerName: string   // what the AI introduces itself as
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    key:             'american',
    accent:          'American English',
    flag:            '🇺🇸',
    voiceId:         'f0JpDwzbGK384Dd1WH2s', // Ananya (female) — matches the default interviewer
    description:     'Clear, neutral American accent',
    interviewerName: 'Ananya',
  },
  {
    key:             'british',
    accent:          'British English',
    flag:            '🇬🇧',
    voiceId:         'onwK4e9ZLuTAKqWW03F9', // Daniel
    description:     'Professional British accent',
    interviewerName: 'James',
  },
  {
    key:             'indian',
    accent:          'Indian English',
    flag:            '🇮🇳',
    voiceId:         'pNInz6obpgDQGcFmaJgB', // Adam (native Indian voice coming soon)
    description:     'Neutral accent, comfortable for Indian candidates',
    interviewerName: 'Vikram',
  },
]

export const DEFAULT_VOICE_KEY = 'american'

/** Look up a voice option by key, falling back to american. */
export function getVoiceOption(key?: string | null): VoiceOption {
  return VOICE_OPTIONS.find((v) => v.key === key) ?? VOICE_OPTIONS[0]
}

/** Get the ElevenLabs voice ID for a given key. */
export function getVoiceId(key?: string | null): string {
  return getVoiceOption(key).voiceId
}

/** Get the interviewer name for a given key. */
export function getInterviewerName(key?: string | null): string {
  return getVoiceOption(key).interviewerName
}
