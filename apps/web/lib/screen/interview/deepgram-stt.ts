// ── Deepgram streaming STT client (Build I-P0-3, Part 2) ────────────────────
// Replaces the browser Web Speech API. Captures mic audio in the browser and
// streams it to Deepgram's realtime WebSocket using a short-lived grant token
// (minted by /api/deepgram/token — the long-lived key never reaches the client).
//
// Why this shape: Deepgram runs the transcription in its cloud (Nova-tier), so
// quality no longer depends on the device's built-in recognizer. We use:
//   • interim_results  — live partials for responsiveness
//   • endpointing + utterance_end_ms — ADAPTIVE turn-taking (replaces the fixed
//     1500 ms client timer): Deepgram tells us when the candidate actually
//     finished, so Alex responds promptly without cutting people off.
//   • diarize          — speaker labels, captured for the downstream fraud build.
//
// The transcript feeds the SAME evaluation/report/integrity flow as before — the
// caller wires onInterim → live transcript and onUtteranceEnd → capture.

export interface DeepgramWord { word: string; speaker?: number }

export interface DeepgramSttHandlers {
  onOpen?: () => void
  onInterim?: (text: string) => void           // running partial (finalized + interim)
  onUtteranceEnd?: (text: string, words: DeepgramWord[]) => void // adaptive endpoint
  onError?: (reason: string) => void
  onClose?: () => void
}

const DG_URL = 'wss://api.deepgram.com/v1/listen'
// Nova-3 is Deepgram's current best general model; tuned for natural turn-taking.
const DG_PARAMS = new URLSearchParams({
  model: 'nova-3',
  language: 'en-US',
  smart_format: 'true',
  interim_results: 'true',
  diarize: 'true',          // speaker labels for the fraud/diarization build
  punctuate: 'true',
  endpointing: '300',       // ms of silence that finalizes a chunk
  utterance_end_ms: '1000', // ms of silence that ends the turn (adaptive endpoint)
  vad_events: 'true',
}).toString()

interface DgResults {
  type?: string
  is_final?: boolean
  speech_final?: boolean
  channel?: { alternatives?: Array<{ transcript?: string; words?: DeepgramWord[] }> }
}

export class DeepgramStt {
  private ws: WebSocket | null = null
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private keepAlive: ReturnType<typeof setInterval> | null = null
  private finalized = ''                 // concatenated is_final segments this turn
  private words: DeepgramWord[] = []      // diarized words this turn
  private stopped = false

  constructor(private handlers: DeepgramSttHandlers) {}

  // Returns false if STT can't start (caller should fall back to Web Speech).
  async start(): Promise<boolean> {
    try {
      const res = await fetch('/api/deepgram/token', { method: 'POST' })
      if (!res.ok) return false
      const { token, kind } = (await res.json()) as { token?: string; kind?: string }
      if (!token) return false

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (this.stopped) { this.cleanup(); return false }

      // Grant tokens authenticate as Bearer; raw keys use the `token` subprotocol.
      const protocols = kind === 'grant' ? ['bearer', token] : ['token', token]
      this.ws = new WebSocket(`${DG_URL}?${DG_PARAMS}`, protocols)

      this.ws.onopen = () => {
        if (this.stopped || !this.stream) return
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        this.recorder = new MediaRecorder(this.stream, { mimeType: mime })
        this.recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) this.ws.send(e.data)
        }
        this.recorder.start(250) // emit a chunk every 250 ms
        // KeepAlive so Deepgram doesn't close the socket during silence.
        this.keepAlive = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'KeepAlive' }))
        }, 8000)
        this.handlers.onOpen?.()
      }

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

  private onMessage(evt: MessageEvent) {
    let msg: DgResults
    try { msg = JSON.parse(typeof evt.data === 'string' ? evt.data : '') } catch { return }

    if (msg.type === 'UtteranceEnd') {
      this.flushTurn()
      return
    }
    if (msg.type && msg.type !== 'Results') return

    const alt = msg.channel?.alternatives?.[0]
    const piece = (alt?.transcript ?? '').trim()
    if (msg.is_final) {
      if (piece) {
        this.finalized = `${this.finalized} ${piece}`.trim()
        if (alt?.words?.length) this.words.push(...alt.words)
      }
      // speech_final = Deepgram detected end-of-turn → adaptive endpoint.
      if (msg.speech_final) this.flushTurn()
    } else if (piece || this.finalized) {
      this.handlers.onInterim?.(`${this.finalized} ${piece}`.trim())
    }
  }

  private flushTurn() {
    const text = this.finalized.trim()
    if (!text) return
    const words = this.words
    this.finalized = ''
    this.words = []
    this.handlers.onUtteranceEnd?.(text, words)
  }

  stop() {
    this.stopped = true
    this.cleanup()
  }

  private cleanup() {
    if (this.keepAlive) { clearInterval(this.keepAlive); this.keepAlive = null }
    try { this.recorder?.stop() } catch {}
    this.recorder = null
    try { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'CloseStream' })) } catch {}
    try { this.ws?.close() } catch {}
    this.ws = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }
}
