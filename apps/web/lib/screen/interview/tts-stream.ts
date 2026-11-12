// ── Streamed interviewer TTS player (Screen-scoped, browser-only) ───────────
// Plays the raw PCM (s16le mono) that /api/interview/generate-speech streams
// from ElevenLabs, scheduling each chunk on a Web Audio clock AS IT ARRIVES —
// the first words play ~1s after the request instead of after the whole line.
// Web Audio (not <audio>/MediaSource) so it works on every browser incl. iOS
// Safari, starts/stops instantly (barge-in), and reports real first-audio time.
//
// There is deliberately NO browser speechSynthesis fallback anywhere: the
// interviewer speaks in the ElevenLabs voice or the room shows "reconnecting".

export type TtsFailureKind =
  | 'unauthorized' | 'rate_limited' | 'http' | 'network'
  | 'first_audio_timeout' | 'stalled' | 'autoplay_blocked' | 'cancelled'

export class TtsError extends Error {
  constructor(public kind: TtsFailureKind, public status?: number, public played = false) { super(kind) }
}

const envNum = (v: string | undefined, d: number) => { const n = Number(v); return v && Number.isFinite(n) && n > 0 ? n : d }
export const TTS_TIMING = {
  firstAudioTimeoutMs: envNum(process.env.NEXT_PUBLIC_TTS_FIRST_AUDIO_TIMEOUT_MS, 7000),
  stallTimeoutMs: envNum(process.env.NEXT_PUBLIC_TTS_STALL_TIMEOUT_MS, 6000),
  reconnectMaxMs: envNum(process.env.NEXT_PUBLIC_TTS_RECONNECT_MAX_MS, 45000),
}

/* ── one shared AudioContext, unlocked by a user gesture ──────────────────── */
let ctx: AudioContext | null = null
export function ttsContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx && ctx.state !== 'closed') return ctx
  const Ctx: typeof AudioContext | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  ctx = Ctx ? new Ctx() : null
  return ctx
}

/** Call from a click/tap handler (e.g. "Start interview") so later playback isn't blocked. */
export async function unlockTtsAudio(): Promise<boolean> {
  const c = ttsContext()
  if (!c) return false
  try { if (c.state !== 'running') await c.resume() } catch {}
  try {   // iOS needs a sound started inside the gesture
    const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0)
  } catch {}
  return c.state === 'running'
}

export interface StreamHandle {
  /** Stop playback now. The play() promise resolves 'stopped'. */
  stop(): void
}

export interface PlayOptions {
  url: string
  body: unknown
  headers?: Record<string, string>
  onPlaying?: () => void              // fired when the first sample is actually audible
  register?: (h: StreamHandle) => void
}

const MIN_FIRST_SAMPLES = 0.1   // seconds buffered before the first chunk plays
const MIN_CHUNK_SAMPLES = 0.25  // later chunks are coalesced to ~250 ms

/**
 * Fetch + play one streamed line. Resolves 'done' when the last sample has
 * played, 'stopped' if stop() was called. Rejects with TtsError on failure.
 */
export async function playStreamedSpeech(o: PlayOptions): Promise<'done' | 'stopped'> {
  const c = ttsContext()
  if (!c) throw new TtsError('autoplay_blocked')
  if (c.state !== 'running') { try { await c.resume() } catch {} }
  if (c.state !== 'running') throw new TtsError('autoplay_blocked')

  const controller = new AbortController()
  const sources = new Set<AudioBufferSourceNode>()
  let stopped = false
  let failKind: TtsFailureKind | null = null
  let resolveStop: (() => void) | null = null
  const stopPromise = new Promise<'stopped'>((r) => { resolveStop = () => r('stopped') })

  const handle: StreamHandle = {
    stop() {
      if (stopped) return
      stopped = true
      controller.abort()
      sources.forEach((s) => { try { s.stop() } catch {} })
      sources.clear()
      resolveStop?.()
    },
  }
  o.register?.(handle)

  let firstTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => { failKind = 'first_audio_timeout'; controller.abort() }, TTS_TIMING.firstAudioTimeoutMs)
  let stallTimer: ReturnType<typeof setTimeout> | null = null
  const armStall = () => { if (stallTimer) clearTimeout(stallTimer); stallTimer = setTimeout(() => { failKind = 'stalled'; controller.abort() }, TTS_TIMING.stallTimeoutMs) }
  const clearTimers = () => { if (firstTimer) clearTimeout(firstTimer); if (stallTimer) clearTimeout(stallTimer); firstTimer = stallTimer = null }

  const run = async (): Promise<'done'> => {
    let res: Response
    try {
      res = await fetch(o.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...o.headers }, body: JSON.stringify(o.body), signal: controller.signal })
    } catch {
      throw new TtsError(failKind ?? 'network')
    }
    if (!res.ok || !res.body) {
      throw new TtsError(res.status === 401 ? 'unauthorized' : res.status === 429 ? 'rate_limited' : 'http', res.status)
    }
    const rate = Number(res.headers.get('X-Audio-Sample-Rate')) || 24000
    const reader = res.body.getReader()
    let carry: Uint8Array | null = null          // odd trailing byte between chunks
    let pending: Float32Array[] = []; let pendingLen = 0
    let nextTime = 0
    let started = false

    const schedule = (final: boolean) => {
      const need = (started ? MIN_CHUNK_SAMPLES : MIN_FIRST_SAMPLES) * rate
      if (!pendingLen || (!final && pendingLen < need)) return
      const buf = c.createBuffer(1, pendingLen, rate)
      const ch = buf.getChannelData(0)
      let off = 0
      for (const p of pending) { ch.set(p, off); off += p.length }
      pending = []; pendingLen = 0
      const src = c.createBufferSource()
      src.buffer = buf
      src.connect(c.destination)
      // Underrun (network slower than speech) → resume from "now" with a small lead.
      const at = Math.max(nextTime, c.currentTime + 0.04)
      src.start(at)
      nextTime = at + buf.duration
      sources.add(src)
      src.onended = () => sources.delete(src)
      if (!started) {
        started = true
        if (firstTimer) { clearTimeout(firstTimer); firstTimer = null }
        const delayMs = Math.max(0, (at - c.currentTime) * 1000)
        setTimeout(() => { if (!stopped) o.onPlaying?.() }, delayMs)
      }
    }

    try {
      armStall()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        armStall()
        let bytes = value
        if (carry) { const m = new Uint8Array(carry.length + bytes.length); m.set(carry); m.set(bytes, carry.length); bytes = m; carry = null }
        if (bytes.length % 2) { carry = bytes.slice(bytes.length - 1); bytes = bytes.subarray(0, bytes.length - 1) }
        if (!bytes.length) continue
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        const f = new Float32Array(bytes.length / 2)
        for (let i = 0; i < f.length; i++) f[i] = view.getInt16(i * 2, true) / 0x8000
        pending.push(f); pendingLen += f.length
        schedule(false)
      }
    } catch {
      throw new TtsError(failKind ?? 'network', undefined, started)
    }
    schedule(true)
    clearTimers()
    if (!started) throw new TtsError('http', 204)   // stream ended with no audio
    // Wait for the scheduled audio to finish playing.
    await new Promise<void>((r) => setTimeout(r, Math.max(0, (nextTime - c.currentTime) * 1000) + 30))
    return 'done'
  }

  try {
    const playing = run()
    playing.catch(() => {})   // if stop() wins the race, the abandoned fetch must not surface as unhandled
    return await Promise.race([playing, stopPromise])
  } catch (e) {
    if (stopped) return 'stopped'
    throw e instanceof TtsError ? e : new TtsError('network')
  } finally {
    clearTimers()
  }
}
