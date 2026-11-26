// ── Live voice levels for the room's visualizer (Screen-scoped, browser) ────
// Presentation only. The AI level comes from a passive AnalyserNode on the TTS
// playback path (tts-stream.ts); the candidate level is published by the
// barge-in detector's mic frames. Nothing here affects playback, STT or VAD.

let mic = 0
let micAt = 0

/** Called per mic frame (≈ every 64 ms) with the frame RMS. */
export function publishMicLevel(rms: number) { mic = rms; micAt = performance.now() }

/** Candidate mic level 0–1 (0 when no recent frames). */
export function micLevel(): number {
  if (typeof performance === 'undefined' || performance.now() - micAt > 400) return 0
  return Math.min(1, Math.sqrt(mic) * 3.2)
}

export interface Bands { level: number; low: number; mid: number; high: number }
const ZERO: Bands = { level: 0, low: 0, mid: 0, high: 0 }
let freq: Uint8Array | null = null
let wave: Float32Array | null = null

/** AI voice level + three spectral bands (0–1) from the TTS analyser. */
export function readBands(an: AnalyserNode | null): Bands {
  if (!an) return ZERO
  if (!freq || freq.length !== an.frequencyBinCount) freq = new Uint8Array(an.frequencyBinCount)
  if (!wave || wave.length !== an.fftSize) wave = new Float32Array(an.fftSize)
  an.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>)
  an.getFloatTimeDomainData(wave as Float32Array<ArrayBuffer>)
  let s = 0
  for (let i = 0; i < wave.length; i++) s += wave[i] * wave[i]
  const rms = Math.sqrt(s / wave.length)
  // Speech energy sits in the low bins at 24 kHz; split the first ~third.
  const n = Math.max(6, Math.floor(freq.length / 3))
  const band = (a: number, b: number) => { let t = 0; for (let i = a; i < b; i++) t += freq![i]; return t / ((b - a) * 255) }
  return {
    level: Math.min(1, rms * 5),
    low: band(1, Math.floor(n * 0.25)),
    mid: band(Math.floor(n * 0.25), Math.floor(n * 0.6)),
    high: band(Math.floor(n * 0.6), n),
  }
}
