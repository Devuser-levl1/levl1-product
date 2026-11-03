// ── Barge-in detector (Screen, Fixpack 4 #17) ──────────────────────────────
// While the interviewer's TTS plays, watch the mic for the CANDIDATE starting
// to talk. Scribe STT isn't running during TTS (turn-taking is sequential), so
// this is a lightweight energy VAD on its own echo-cancelled mic stream.
//
// False-trigger guard (the interviewer must not be cut off by a cough, a click,
// or her own voice leaking back through the speakers):
//   • calibrate: the first CALIBRATE_MS of each playback measures the ambient +
//     echo level; speech must exceed max(MIN_DB, baseline × RATIO);
//   • sustain: speech-energy frames must accumulate MIN_SPEECH_MS (gaps decay
//     the count rather than resetting it, so natural syllable gaps still count,
//     but a single burst never does);
//   • grace: nothing can trigger in the first ARM_GRACE_MS of playback.
//
// On trigger the detector keeps buffering mic audio (from slightly BEFORE the
// detected onset) until takePreroll() is called — the next Scribe session sends
// that buffer first, so the candidate's opening words aren't lost while the STT
// socket connects.
//
// Tunable via NEXT_PUBLIC_ env (read at build): see BARGE_IN_CONFIG.

const num = (v: string | undefined, d: number) => (v !== undefined && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : d)

export const BARGE_IN_CONFIG = {
  enabled: (process.env.NEXT_PUBLIC_BARGE_IN_ENABLED ?? 'true') !== 'false',
  /** Sustained candidate speech needed to interrupt (ms). Higher = fewer false triggers, slower. */
  minSpeechMs: num(process.env.NEXT_PUBLIC_BARGE_IN_MIN_SPEECH_MS, 400),
  /** Speech must be this many × louder than the calibrated ambient+echo level. */
  ratio: num(process.env.NEXT_PUBLIC_BARGE_IN_RATIO, 3),
  /** Absolute floor in dBFS — quieter than this is never speech. */
  minDb: num(process.env.NEXT_PUBLIC_BARGE_IN_MIN_DB, -42),
  calibrateMs: 300,
  armGraceMs: 600,
  preRollMs: 250,       // audio kept from before the detected onset
  maxBufferMs: 12_000,  // stop buffering if nobody takes it
}

const RATE = 16000
const FRAME = 512       // 32 ms at 16 kHz

export class BargeInDetector {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private node: ScriptProcessorNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private starting: Promise<boolean> | null = null
  private rate = RATE   // actual context rate (some browsers ignore the 16 kHz request)

  private armed = false
  private triggered = false
  private armedAt = 0
  private calib: number[] = []
  private threshold = 0
  private baseline = 0
  private speechMs = 0
  private onsetFrame = -1
  private frames: Float32Array[] = []   // rolling buffer (pre-trigger) / capture (post-trigger)
  private onTrigger: (() => void) | null = null

  constructor(private cfg = BARGE_IN_CONFIG) {}

  get isTriggered() { return this.triggered }

  /** Open the mic once (permission is already granted by the interview). */
  async ensureStarted(): Promise<boolean> {
    if (this.node) return true
    if (this.starting) return this.starting
    this.starting = (async () => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        const Ctx: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new Ctx({ sampleRate: RATE })
        this.rate = this.ctx.sampleRate
        this.source = this.ctx.createMediaStreamSource(this.stream)
        this.node = this.ctx.createScriptProcessor(FRAME, 1, 1)
        this.node.onaudioprocess = (e) => this.onFrame(e.inputBuffer.getChannelData(0))
        this.source.connect(this.node)
        this.node.connect(this.ctx.destination)
        return true
      } catch {
        this.dispose()
        return false
      }
    })()
    return this.starting
  }

  /** Start watching for the candidate (call when TTS playback begins). */
  arm(onTrigger: () => void) {
    if (!this.cfg.enabled) return
    this.armed = true
    this.triggered = false
    this.armedAt = performance.now()
    this.calib = []
    this.threshold = 0
    this.speechMs = 0
    this.onsetFrame = -1
    this.frames = []
    this.onTrigger = onTrigger
    void this.ensureStarted()
  }

  /** Stop watching (TTS ended normally) — drops any buffered audio. */
  disarm() {
    this.armed = false
    this.triggered = false
    this.onTrigger = null
    this.frames = []
  }

  /**
   * After a trigger: hand over the buffered audio (16 kHz mono) from just
   * before the onset up to now, and stop buffering. Returns null if nothing.
   */
  takePreroll(): Float32Array | null {
    if (!this.triggered || !this.frames.length) { this.disarm(); return null }
    const total = this.frames.reduce((n, f) => n + f.length, 0)
    const out = new Float32Array(total)
    let o = 0
    for (const f of this.frames) { out.set(f, o); o += f.length }
    this.disarm()
    return this.rate === RATE ? out : downsample(out, this.rate, RATE)
  }

  dispose() {
    this.disarm()
    try { this.node?.disconnect() } catch {}
    try { this.source?.disconnect() } catch {}
    try { void this.ctx?.close() } catch {}
    this.stream?.getTracks().forEach((t) => t.stop())
    this.node = null; this.source = null; this.ctx = null; this.stream = null; this.starting = null
  }

  private thresholdFor(baseline: number): number {
    return Math.max(Math.pow(10, this.cfg.minDb / 20), baseline * this.cfg.ratio)
  }

  // ── per-frame VAD ──────────────────────────────────────────────────────
  private onFrame(input: Float32Array) {
    if (!this.armed) return
    const frame = new Float32Array(input)  // copy — the input buffer is reused
    const frameMs = (frame.length / this.rate) * 1000

    if (this.triggered) {
      // Keep capturing until the next STT session takes it.
      this.frames.push(frame)
      if (this.frames.length * frameMs > this.cfg.maxBufferMs) this.disarm()
      return
    }

    // Rolling pre-trigger buffer (onset lookback + current run).
    this.frames.push(frame)
    const keep = Math.ceil((this.cfg.preRollMs + this.cfg.minSpeechMs * 2) / frameMs)
    if (this.frames.length > keep) { this.frames.shift(); if (this.onsetFrame > 0) this.onsetFrame -= 1 }

    const rms = Math.sqrt(frame.reduce((s, x) => s + x * x, 0) / frame.length) || 1e-9
    const elapsed = performance.now() - this.armedAt

    if (elapsed < this.cfg.calibrateMs) { this.calib.push(rms); return }
    if (!this.threshold) {
      const sorted = [...this.calib].sort((a, b) => a - b)
      this.baseline = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1e-4
      this.threshold = this.thresholdFor(this.baseline)
    }
    if (elapsed < this.cfg.armGraceMs) return

    if (rms > this.threshold) {
      if (this.speechMs === 0) this.onsetFrame = this.frames.length - 1
      this.speechMs += frameMs
    } else {
      this.speechMs = Math.max(0, this.speechMs - frameMs * 0.5)  // gaps decay, don't reset
      if (this.speechMs === 0) {
        this.onsetFrame = -1
        // Track the echo level as the TTS gets louder/softer (slow EMA over
        // non-speech frames only), so a loud later phrase can't self-trigger.
        this.baseline = this.baseline * 0.9 + rms * 0.1
        this.threshold = this.thresholdFor(this.baseline)
      }
    }

    if (this.speechMs >= this.cfg.minSpeechMs) {
      this.triggered = true
      // Keep from slightly before the onset; drop older echo-only audio.
      const lookback = Math.ceil(this.cfg.preRollMs / frameMs)
      const start = Math.max(0, (this.onsetFrame < 0 ? this.frames.length - 1 : this.onsetFrame) - lookback)
      this.frames = this.frames.slice(start)
      const cb = this.onTrigger
      this.onTrigger = null
      cb?.()
    }
  }
}

function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (outRate >= inRate) return input
  const ratio = inRate / outRate
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) out[i] = input[Math.floor(i * ratio)]
  return out
}
