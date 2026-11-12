// ── Interview voice config (Screen-scoped, server-only) ────────────────────
// One ElevenLabs account powers both TTS and STT: ELEVENLABS_API_KEY and
// ELEVENLABS_VOICE_ID are shared. What differs is the MODEL in each call, so
// each is its own env var, read at REQUEST time (switch on Render, no rebuild):
//
//   ELEVENLABS_TTS_MODEL             default eleven_v4_turbo   (A/B: eleven_v4)
//   ELEVENLABS_STT_MODEL             default scribe_v3_live    (live interview)
//   ELEVENLABS_STT_BATCH_MODEL       default scribe_v3         (post-interview diarization)
//   ELEVENLABS_STT_COMMIT_STRATEGY   default turn_prediction on scribe_v3_live, else vad
//   ELEVENLABS_STT_VAD_SILENCE_SECS  optional; else the client default (1.4)
//   ELEVENLABS_STT_COMMIT_GRACE_MS   optional; else the client default
//
// No silent model fallback: if a configured model is rejected, the call fails
// and is logged loudly (and /api/interview/voice-check reports it up front).

export const TTS_DEFAULT = 'eleven_v4_turbo'
export const STT_LIVE_DEFAULT = 'scribe_v3_live'
export const STT_BATCH_DEFAULT = 'scribe_v3'

const MODEL_RE = /^[a-z0-9_]{3,64}$/

function model(envName: string, fallback: string): string {
  const v = process.env[envName]?.trim()
  if (!v) return fallback
  if (!MODEL_RE.test(v)) {
    // Misconfiguration is loud, never silently replaced by a different model.
    throw new Error(`${envName}="${v}" is not a valid ElevenLabs model id`)
  }
  return v
}

export const ttsModel = () => model('ELEVENLABS_TTS_MODEL', TTS_DEFAULT)
export const sttLiveModel = () => model('ELEVENLABS_STT_MODEL', STT_LIVE_DEFAULT)
export const sttBatchModel = () => model('ELEVENLABS_STT_BATCH_MODEL', STT_BATCH_DEFAULT)

/** Models whose voices understand inline audio tags like [warmly] (ElevenLabs v3/v4 family). */
export const ttsSupportsAudioTags = (m: string) => /^eleven_(v4|v3)/.test(m)

export type CommitStrategy = 'vad' | 'turn_prediction'
/** turn_prediction is only accepted by scribe_v3_live (others close the socket with invalid_request). */
export function sttCommitStrategy(liveModel: string): CommitStrategy {
  const supportsTurn = liveModel.startsWith('scribe_v3')
  const want = process.env.ELEVENLABS_STT_COMMIT_STRATEGY?.trim()
  if (want === 'vad') return 'vad'
  if (want === 'turn_prediction') {
    if (supportsTurn) return 'turn_prediction'
    console.error(JSON.stringify({ evt: 'stt_config_error', detail: `turn_prediction is not supported by ${liveModel}; using vad`, model: liveModel }))
    return 'vad'
  }
  if (want) console.error(JSON.stringify({ evt: 'stt_config_error', detail: `unknown ELEVENLABS_STT_COMMIT_STRATEGY "${want}"`, model: liveModel }))
  return supportsTurn ? 'turn_prediction' : 'vad'
}

const optNum = (name: string, min: number, max: number): number | undefined => {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined
}

/** Everything the browser STT client needs from the server, sent with each token. */
export function sttClientConfig() {
  const m = sttLiveModel()
  return {
    model: m,
    commitStrategy: sttCommitStrategy(m),
    // Scribe accepts 0.192–3.0 s.
    vadSilenceSecs: optNum('ELEVENLABS_STT_VAD_SILENCE_SECS', 0.3, 3),
    commitGraceMs: optNum('ELEVENLABS_STT_COMMIT_GRACE_MS', 0, 4000),
  }
}

export { ALLOWED_AUDIO_TAGS, stripAudioTags, limitAudioTags } from './audio-tags'
