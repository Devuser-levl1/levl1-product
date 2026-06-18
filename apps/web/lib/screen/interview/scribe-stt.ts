// ── ElevenLabs Scribe v2 Realtime STT client (replaces Deepgram) ────────────
// Single-vendor with our TTS. The browser captures mic audio, streams 16 kHz PCM
// to Scribe's realtime WebSocket, and receives partial + committed transcripts.
//
// Auth: a SINGLE-USE token (minted by /api/elevenlabs/stt-token from the
// server-side ELEVENLABS_API_KEY) is passed as ?token= — the raw key never
// reaches the client, and there's no special key-scope dance.
//
// Endpointing (the Deepgram cut-off lesson): commit_strategy=vad with a silence
// threshold tuned ABOVE ElevenLabs' 1.5s default so brief natural pauses don't
// end the turn. `committed_transcript` = true end-of-turn → onUtteranceEnd.
//
// Realtime only — the interview-long recording for batch fraud diarization is
// handled separately (a dedicated recorder spanning the whole interview), since
// this client is started/stopped per turn.

export interface ScribeWord { text: string; start?: number; end?: number }

export interface ScribeSttHandlers {
  onOpen?: () => void
  onInterim?: (text: string) => void
  onUtteranceEnd?: (text: string, words: ScribeWord[]) => void
  onError?: (reason: string) => void
  onClose?: () => void
}

export interface ScribeSttOptions {
  languageCode?: string        // e.g. 'en' | 'en-IN' (ISO 639); configurable per interview
  keyterms?: string[]          // model biasing for control + technical words
  vadSilenceSecs?: number      // turn-end silence; higher = won't cut off mid-sentence
}

const WS_BASE = process.env.NEXT_PUBLIC_SCRIBE_WS_URL ?? 'wss://api.elevenlabs.io/v1/speech-to-text/realtime'
const MODEL_ID = process.env.NEXT_PUBLIC_SCRIBE_MODEL ?? 'scribe_v2_realtime'
const TARGET_RATE = 16000  // pcm_16000

// Interview control words + the "finish→fish" class of misheard terms, plus a few
// common technical terms. Callers can extend per position.
export const DEFAULT_KEYTERMS = [
  'finish', 'stop', 'end', 'repeat', 'skip', 'pause', 'continue', 'next',
  'end the interview', 'finish my interview', 'stop the interview',
  'API', 'SQL', 'React', 'Kubernetes', 'latency', 'concurrency', 'idempotent',
]

// Inbound messages key on `message_type` (verified against the live WS).
interface ScribeMsg {
  message_type?: string
  text?: string
  transcript?: string
  words?: ScribeWord[]
}

export class ScribeStt {
  private ws: WebSocket | null = null
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private node: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private stopped = false

  constructor(private handlers: ScribeSttHandlers, private opts: ScribeSttOptions = {}) {}

  // Returns false if STT can't start (caller falls back to Web Speech).
  async start(): Promise<boolean> {
    try {
      const res = await fetch('/api/elevenlabs/stt-token', { method: 'POST' })
      if (!res.ok) return false
      const { token } = (await res.json()) as { token?: string }
      if (!token) return false

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      if (this.stopped) { this.cleanup(); return false }

      const params = new URLSearchParams({
        model_id: MODEL_ID,
        audio_format: 'pcm_16000',
        commit_strategy: 'vad',
        vad_silence_threshold_secs: String(this.opts.vadSilenceSecs ?? 2.0),
        token,
      })
      if (this.opts.languageCode) params.set('language_code', this.opts.languageCode)
      for (const k of (this.opts.keyterms ?? DEFAULT_KEYTERMS)) params.append('keyterms', k)

      this.ws = new WebSocket(`${WS_BASE}?${params.toString()}`)
      this.ws.onopen = () => { if (!this.stopped) this.beginCapture() }
      this.ws.onmessage = (evt) => this.onMessage(evt)
      this.ws.onerror = () => this.handlers.onError?.('socket_error')
      this.ws.onclose = () => this.handlers.onClose?.()
      return true
    } catch (err) {
      this.handlers.onError?.(err instanceof Error ? err.message : 'start_failed')
      this.cleanup()
      return false
    }
  }

  private beginCapture() {
    if (!this.stream) return
    // Realtime PCM via Web Audio. AudioContext is resampled to 16 kHz where the
    // browser honours it; otherwise we downsample each block.
    const Ctx: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioCtx = new Ctx({ sampleRate: TARGET_RATE })
    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    this.node = this.audioCtx.createScriptProcessor(4096, 1, 1)
    const inRate = this.audioCtx.sampleRate
    this.node.onaudioprocess = (e) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      const input = e.inputBuffer.getChannelData(0)
      const pcm = floatTo16BitPCM(inRate === TARGET_RATE ? input : downsample(input, inRate, TARGET_RATE))
      // Verified wire format: input_audio_chunk + audio_base_64 + sample_rate.
      this.ws.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: base64FromBuffer(pcm), sample_rate: TARGET_RATE }))
    }
    this.source.connect(this.node)
    this.node.connect(this.audioCtx.destination)
  }

  private onMessage(evt: MessageEvent) {
    let msg: ScribeMsg
    try { msg = JSON.parse(typeof evt.data === 'string' ? evt.data : '') } catch { return }
    const text = (msg.text ?? msg.transcript ?? '').trim()
    switch (msg.message_type) {
      case 'session_started':
        this.handlers.onOpen?.()
        break
      case 'partial_transcript':
        if (text) this.handlers.onInterim?.(text)
        break
      case 'committed_transcript':
      case 'committed_transcript_with_timestamps':
        if (text) this.handlers.onUtteranceEnd?.(text, msg.words ?? [])
        break
      case 'auth_error': case 'quota_exceeded': case 'rate_limited':
      case 'resource_exhausted': case 'transcriber_error': case 'input_error':
        this.handlers.onError?.(msg.message_type)
        break
    }
  }

  stop() { this.stopped = true; this.cleanup() }

  private cleanup() {
    try { this.node?.disconnect() } catch {}
    try { this.source?.disconnect() } catch {}
    try { this.audioCtx?.close() } catch {}
    this.node = null; this.source = null; this.audioCtx = null
    try { if (this.ws?.readyState === WebSocket.OPEN) this.ws.close() } catch {}
    this.ws = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }
}

// ── PCM helpers ─────────────────────────────────────────────────────────────
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const out = new DataView(new ArrayBuffer(input.length * 2))
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return out.buffer
}

function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input
  const ratio = inRate / outRate
  const outLen = Math.floor(input.length / ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) out[i] = input[Math.floor(i * ratio)]
  return out
}

function base64FromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
