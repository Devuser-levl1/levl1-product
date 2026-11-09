// ── ElevenLabs Scribe v2 Realtime STT client (replaces Deepgram) ────────────
// Single-vendor with our TTS. The browser captures mic audio, streams 16 kHz PCM
// to Scribe's realtime WebSocket, and receives partial + committed transcripts.
//
// Auth: a SINGLE-USE token (minted by /api/elevenlabs/stt-token from the
// server-side ELEVENLABS_API_KEY) is passed as ?token= — the raw key never
// reaches the client.
//
// Fixpack 8 #6 — no dropped words, less latency:
//   • Token fetch and mic open run in PARALLEL, and the next turn's token is
//     pre-fetched, so the socket opens sooner.
//   • Capture starts the moment the mic is open. Audio produced before the
//     socket is ready is QUEUED and flushed on open — the "chime played but the
//     first words vanished" gap is gone.
//   • A VAD commit no longer ends the turn by itself: committed segments are
//     merged, and the turn ends only after COMMIT_GRACE_MS with no new speech.
//     A mid-answer thinking pause no longer clips the rest of the answer.
//   • Smaller chunks (lower latency) + averaged downsampling (less aliasing).
//   • previous_text (the interviewer's question) is sent with the first chunk
//     as context, so terms used in the question are recognised in the answer.
// Timings are env-tunable (NEXT_PUBLIC_SCRIBE_*); see SCRIBE_DEFAULTS.
//
// Realtime only — the interview-long recording for batch fraud diarization is
// handled separately.

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
  vadSilenceSecs?: number      // silence that makes Scribe COMMIT a segment
  commitGraceMs?: number       // extra wait after a commit before the TURN ends
  previousText?: string        // context for the first chunk (the question asked)
  // Barge-in (Fixpack 4): audio (16 kHz mono) captured while the interviewer was
  // still speaking. Sent first, the moment the socket opens. Called once.
  preroll?: () => Float32Array | null
  // Fixpack 8: transform applied to interim + final text (tech-term fix-up).
  normalize?: (text: string) => string
}

const num = (v: string | undefined, d: number, min: number, max: number) => {
  const n = Number(v)
  return Number.isFinite(n) && v !== undefined && v !== '' ? Math.min(max, Math.max(min, n)) : d
}

/** Effective timing defaults (env-tunable; clamped to sane ranges). */
export const SCRIBE_DEFAULTS = {
  // Segment commit after this much silence (ElevenLabs default ≈ 1.5s).
  vadSilenceSecs: num(process.env.NEXT_PUBLIC_SCRIBE_VAD_SILENCE_SECS, 1.4, 0.5, 4),
  // Turn ends when no new speech arrives this long after a commit.
  // Effective pause tolerance ≈ vadSilenceSecs + commitGraceMs (default ≈ 2.3s).
  commitGraceMs: num(process.env.NEXT_PUBLIC_SCRIBE_COMMIT_GRACE_MS, 900, 0, 4000),
  // ScriptProcessor block size in samples (2048 @16 kHz ≈ 128 ms per chunk).
  chunkSamples: [1024, 2048, 4096].includes(Number(process.env.NEXT_PUBLIC_SCRIBE_CHUNK_SAMPLES)) ? Number(process.env.NEXT_PUBLIC_SCRIBE_CHUNK_SAMPLES) : 2048,
  filterBackgroundAudio: process.env.NEXT_PUBLIC_SCRIBE_FILTER_BACKGROUND === '1',
}

const WS_BASE = process.env.NEXT_PUBLIC_SCRIBE_WS_URL ?? 'wss://api.elevenlabs.io/v1/speech-to-text/realtime'
const MODEL_ID = process.env.NEXT_PUBLIC_SCRIBE_MODEL ?? 'scribe_v2_realtime'
const TARGET_RATE = 16000              // pcm_16000
const MAX_QUEUE_SAMPLES = TARGET_RATE * 30   // ≤30 s buffered before the socket opens / for replay
const TOKEN_TTL_MS = 4 * 60 * 1000     // single-use tokens are short-lived; stay well inside

// Interview control words (the "finish→fish" class of misheard terms). Tech
// terms come from lib/screen/tech-terms (sttKeyterms) per position.
export const DEFAULT_KEYTERMS = [
  'finish', 'stop', 'end', 'repeat', 'skip', 'pause', 'continue', 'next',
  'end the interview', 'finish my interview', 'stop the interview',
]

/* ── token pre-fetch (one spare token, used by the next turn) ─────────────── */
let spare: { token: string; at: number } | null = null
let spareInflight: Promise<void> | null = null

async function mintToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/elevenlabs/stt-token', { method: 'POST' })
    if (!res.ok) return null
    const { token } = (await res.json()) as { token?: string }
    return token ?? null
  } catch { return null }
}
export function prefetchScribeToken() {
  if (spareInflight || (spare && Date.now() - spare.at < TOKEN_TTL_MS)) return
  spareInflight = mintToken().then((t) => { if (t) spare = { token: t, at: Date.now() } }).finally(() => { spareInflight = null })
}
async function takeToken(): Promise<{ token: string | null; cached: boolean }> {
  if (spare && Date.now() - spare.at < TOKEN_TTL_MS) { const t = spare.token; spare = null; return { token: t, cached: true } }
  spare = null
  return { token: await mintToken(), cached: false }
}

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
  private queue: ArrayBuffer[] = []          // captured before the socket opened
  private replay: ArrayBuffer[] = []         // everything sent until the first transcript (auth retry)
  private replaySamples = 0
  private gotTranscript = false
  private retried = false
  private firstChunkSent = false
  private committed: string[] = []
  private words: ScribeWord[] = []
  private partial = ''
  private graceTimer: ReturnType<typeof setTimeout> | null = null
  private ended = false
  private readonly grace: number
  private readonly vad: number

  constructor(private handlers: ScribeSttHandlers, private opts: ScribeSttOptions = {}) {
    this.grace = opts.commitGraceMs ?? SCRIBE_DEFAULTS.commitGraceMs
    this.vad = opts.vadSilenceSecs ?? SCRIBE_DEFAULTS.vadSilenceSecs
  }

  // Returns false if STT can't start (caller falls back to Web Speech).
  async start(): Promise<boolean> {
    try {
      // Token + mic in parallel (was sequential: ~one round-trip saved per turn).
      const [tok, stream] = await Promise.all([
        takeToken(),
        navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }),
      ])
      this.stream = stream
      if (this.stopped) { this.cleanup(); return false }
      if (!tok.token) { this.cleanup(); return false }

      // Start capturing NOW — audio is queued until the socket is open.
      this.beginCapture()
      this.connect(tok.token, tok.cached)
      prefetchScribeToken()   // ready for the next turn
      return true
    } catch (err) {
      this.handlers.onError?.(err instanceof Error ? err.message : 'start_failed')
      this.cleanup()
      return false
    }
  }

  private connect(token: string, cachedToken: boolean) {
    const params = new URLSearchParams({
      model_id: MODEL_ID,
      audio_format: 'pcm_16000',
      commit_strategy: 'vad',
      vad_silence_threshold_secs: String(this.vad),
      token,
    })
    if (this.opts.languageCode) params.set('language_code', this.opts.languageCode)
    if (SCRIBE_DEFAULTS.filterBackgroundAudio) params.set('filter_background_audio', 'true')
    for (const k of (this.opts.keyterms ?? DEFAULT_KEYTERMS)) params.append('keyterms', k)

    const ws = new WebSocket(`${WS_BASE}?${params.toString()}`)
    this.ws = ws
    ws.onopen = () => {
      if (this.stopped || this.ws !== ws) return
      this.sendPreroll()
      const q = this.queue; this.queue = []
      for (const buf of q) this.sendPcm(buf)
    }
    ws.onmessage = (evt) => { if (this.ws === ws) this.onMessage(evt, cachedToken) }
    ws.onerror = () => { if (this.ws === ws) this.handlers.onError?.('socket_error') }
    ws.onclose = () => { if (this.ws === ws) this.handlers.onClose?.() }
  }

  /** A pre-fetched token was rejected before any transcript: reconnect once with a fresh one and replay. */
  private async retryWithFreshToken() {
    this.retried = true
    try { this.ws?.close() } catch {}
    this.ws = null
    const token = await mintToken()
    if (!token || this.stopped) { this.handlers.onError?.('auth_error'); return }
    this.queue = [...this.replay, ...this.queue]
    this.replay = []; this.replaySamples = 0; this.firstChunkSent = false
    this.connect(token, false)
  }

  private sendPcm(buf: ArrayBuffer) {
    const ws = this.ws
    if (!ws || ws.readyState !== WebSocket.OPEN) { this.enqueue(buf); return }
    const msg: Record<string, unknown> = { message_type: 'input_audio_chunk', audio_base_64: base64FromBuffer(buf), commit: false, sample_rate: TARGET_RATE }
    if (!this.firstChunkSent) {
      this.firstChunkSent = true
      const prev = this.opts.previousText?.trim()
      if (prev) msg.previous_text = prev.slice(-1000)
    }
    ws.send(JSON.stringify(msg))
    if (!this.gotTranscript && this.replaySamples < MAX_QUEUE_SAMPLES) { this.replay.push(buf); this.replaySamples += buf.byteLength / 2 }
  }

  private enqueue(buf: ArrayBuffer) {
    this.queue.push(buf)
    let samples = this.queue.reduce((a, b) => a + b.byteLength / 2, 0)
    while (samples > MAX_QUEUE_SAMPLES && this.queue.length) samples -= (this.queue.shift() as ArrayBuffer).byteLength / 2
  }

  private sendPreroll() {
    const pre = this.opts.preroll?.()
    if (!pre?.length) return
    for (let i = 0; i < pre.length; i += SCRIBE_DEFAULTS.chunkSamples) this.sendPcm(floatTo16BitPCM(pre.subarray(i, i + SCRIBE_DEFAULTS.chunkSamples)))
  }

  private beginCapture() {
    if (!this.stream) return
    const Ctx: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioCtx = new Ctx({ sampleRate: TARGET_RATE })
    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    this.node = this.audioCtx.createScriptProcessor(SCRIBE_DEFAULTS.chunkSamples, 1, 1)
    const inRate = this.audioCtx.sampleRate
    this.node.onaudioprocess = (e) => {
      if (this.stopped || this.ended) return
      const input = e.inputBuffer.getChannelData(0)
      this.sendPcm(floatTo16BitPCM(inRate === TARGET_RATE ? input : downsample(input, inRate, TARGET_RATE)))
    }
    this.source.connect(this.node)
    this.node.connect(this.audioCtx.destination)
  }

  private fix(t: string) { return this.opts.normalize ? this.opts.normalize(t) : t }
  private fullText() { return [...this.committed, this.partial].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() }

  private clearGrace() { if (this.graceTimer) { clearTimeout(this.graceTimer); this.graceTimer = null } }

  private finishTurn() {
    this.clearGrace()
    if (this.ended) return
    const text = this.fix(this.committed.join(' ').replace(/\s+/g, ' ').trim())
    if (!text) return
    this.ended = true
    this.handlers.onUtteranceEnd?.(text, this.words)
  }

  private onMessage(evt: MessageEvent, cachedToken: boolean) {
    let msg: ScribeMsg
    try { msg = JSON.parse(typeof evt.data === 'string' ? evt.data : '') } catch { return }
    const text = (msg.text ?? msg.transcript ?? '').trim()
    switch (msg.message_type) {
      case 'session_started':
        this.handlers.onOpen?.()
        break
      case 'partial_transcript':
        if (!text || this.ended) break
        this.gotTranscript = true; this.replay = []
        // Speech resumed after a commit → the turn isn't over.
        this.clearGrace()
        this.partial = text
        this.handlers.onInterim?.(this.fix(this.fullText()))
        break
      case 'committed_transcript':
      case 'committed_transcript_with_timestamps':
        if (!text || this.ended) break
        this.gotTranscript = true; this.replay = []
        this.committed.push(text)
        this.partial = ''
        if (msg.words?.length) this.words.push(...msg.words)
        this.handlers.onInterim?.(this.fix(this.fullText()))
        // Wait a beat for more speech before ending the turn (0 = old behaviour).
        this.clearGrace()
        if (this.grace <= 0) this.finishTurn()
        else this.graceTimer = setTimeout(() => this.finishTurn(), this.grace)
        break
      case 'auth_error':
        if (cachedToken && !this.retried && !this.gotTranscript) { void this.retryWithFreshToken(); break }
        this.handlers.onError?.(msg.message_type)
        break
      case 'quota_exceeded': case 'rate_limited': case 'resource_exhausted':
      case 'transcriber_error': case 'input_error': case 'invalid_request': case 'chunk_size_exceeded':
        this.handlers.onError?.(msg.message_type)
        break
    }
  }

  stop() { this.stopped = true; this.clearGrace(); this.cleanup() }

  private cleanup() {
    try { this.node?.disconnect() } catch {}
    try { this.source?.disconnect() } catch {}
    try { this.audioCtx?.close() } catch {}
    this.node = null; this.source = null; this.audioCtx = null
    try { if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close() } catch {}
    this.ws = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.queue = []; this.replay = []
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

/** Box-filter downsample: averages each source window (was nearest-sample, which aliases). */
export function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input
  const ratio = inRate / outRate
  const outLen = Math.floor(input.length / ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const a = Math.floor(i * ratio), b = Math.min(input.length, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = a; j < b; j++) sum += input[j]
    out[i] = b > a ? sum / (b - a) : input[a]
  }
  return out
}

function base64FromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
  return btoa(binary)
}
