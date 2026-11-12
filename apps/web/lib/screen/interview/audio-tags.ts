// ── Interviewer audio tags (Screen-scoped, isomorphic) ─────────────────────
// ElevenLabs v3/v4 voices accept inline delivery tags like [warmly]. The room
// strips them from anything shown on screen; the speech route strips them for
// models without tag support.

// A light, fixed vocabulary — the interviewer may use at most a couple per line
// for natural delivery. Anything else in [brackets] is left as text.
export const ALLOWED_AUDIO_TAGS = ['warmly', 'thoughtfully', 'encouragingly', 'curious', 'reassuring', 'pause', 'short pause', 'laughs softly'] as const
const TAG_RE = new RegExp(`\\[(${ALLOWED_AUDIO_TAGS.map((t) => t.replace(/ /g, '\\s+')).join('|')})\\]\\s*`, 'gi')

/** Remove interviewer audio tags (for models without tag support, and for any on-screen text). */
export const stripAudioTags = (text: string) => text.replace(TAG_RE, '').replace(/\s{2,}/g, ' ').trim()
/** Keep at most `max` allowed tags in a line (don't overdo it). */
export function limitAudioTags(text: string, max = 2): string {
  let n = 0
  return text.replace(TAG_RE, (m) => (++n <= max ? m : ''))
}
