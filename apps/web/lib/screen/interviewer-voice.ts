import { VOICE_OPTIONS, type VoiceOption } from '@/lib/voiceOptions'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

// ── Which voice (and name) the interviewer uses for an interview (Screen) ──
// Precedence: position override → account default (Agency.voiceAccent) →
// env ELEVENLABS_VOICE_ID (applied server-side by generate-speech) → baked
// Ananya default. The interviewer introduces herself/himself with the name that
// matches the voice, so a male voice never says "I'm Ananya".
//
// Legacy note: until now the New Position flow saved 'american' on every
// position even when "Use account default" was chosen, so a stored 'american'
// on a position is treated as "no override" (it was the account default).

export function isVoiceKey(v: unknown): v is string {
  return typeof v === 'string' && VOICE_OPTIONS.some((o) => o.key === v)
}

export interface ResolvedVoice {
  key: string | null        // null → let the server use ELEVENLABS_VOICE_ID / baked default
  name: string              // spoken + displayed interviewer name
}

export function resolveInterviewerVoice(positionVoice: unknown, agencyVoice: unknown): ResolvedVoice {
  const pos = isVoiceKey(positionVoice) && positionVoice !== 'american' ? positionVoice : null
  const key = pos ?? (isVoiceKey(agencyVoice) ? agencyVoice : null)
  const opt: VoiceOption | undefined = key ? VOICE_OPTIONS.find((o) => o.key === key) : undefined
  return { key, name: opt?.interviewerName ?? INTERVIEWER_NAME }
}
