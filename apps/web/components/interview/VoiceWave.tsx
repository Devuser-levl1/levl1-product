'use client'

import { useEffect, useRef } from 'react'
import { ttsAnalyser } from '@/lib/screen/interview/tts-stream'
import { micLevel, readBands } from '@/lib/screen/interview/voice-level'

// ── VoiceWave — the AI interviewer's voice animation (Screen-scoped) ───────
// Layered, translucent waveforms that react to the REAL audio:
//   speaking  → the interviewer's TTS output (passive analyser; low / mid /
//               high bands drive the three layers), indigo · violet · cyan
//   listening → the candidate's mic level, shifting to teal · emerald
//   thinking  → a calm wave with a light sweeping across it
//   idle      → a near-flat, breathing line
// Pure Canvas 2D, ~3 paths a frame, so it stays cheap next to the camera +
// CV pipeline. Honors prefers-reduced-motion. Presentation only. It never
// touches playback, STT or barge-in. Canvas colours stay hex (design rule).

export type WaveMode = 'speaking' | 'listening' | 'thinking' | 'idle'

type RGB = [number, number, number]
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const AI_PALETTE = ['#4F46E5', '#8B5CF6', '#22D3EE'].map(hex)
const YOU_PALETTE = ['#0D9488', '#10B981', '#38BDF8'].map(hex)
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

// Per-layer motion: two sines per layer, drifting in opposite directions.
const LAYERS = [
  { k1: 2.2, k2: 3.7, w1: 1.6, w2: 1.1, p: 0.0, alpha: 0.42, gain: 1.0 },
  { k1: 3.1, k2: 1.8, w1: -1.2, w2: 1.9, p: 2.1, alpha: 0.36, gain: 0.85 },
  { k1: 4.3, k2: 2.6, w1: 2.1, w2: -1.4, p: 4.0, alpha: 0.30, gain: 0.7 },
]

export function VoiceWave({ mode, height = 140, label }: { mode: WaveMode; height?: number; label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef<WaveMode>(mode)
  modeRef.current = mode

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 0
    const H = height
    const resize = () => {
      W = Math.max(120, Math.floor(wrap.clientWidth))
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(wrap)

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const amp = [0.03, 0.03, 0.03]       // smoothed per-layer amplitude (0–1)
    let you = 0                          // smoothed palette mix: 0 = AI, 1 = candidate
    let sweep = 0                        // thinking highlight position
    let t = 0
    let last = performance.now()
    let raf = 0
    let heard = false                    // TTS analyser carried sound during this speaking turn
    let prevMode: WaveMode | null = null

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const m = modeRef.current
      if (m !== prevMode) { if (m === 'speaking') heard = false; prevMode = m }
      t += dt * (reduced ? 0.25 : 1) * (m === 'speaking' ? 1.5 : m === 'listening' ? 1.1 : m === 'thinking' ? 0.8 : 0.4)

      // Targets from the real audio (synthetic fallback if the analyser is silent).
      let target: number[]
      if (m === 'speaking') {
        const b = readBands(ttsAnalyser())
        if (b.level > 0.01) heard = true
        // Once real audio has been heard in this turn, follow it (pauses calm the
        // wave). Synthetic motion only before the first sample arrives (~1 s) or
        // if no analyser exists.
        if (heard) target = [0.25 + b.low * 1.4, 0.2 + b.mid * 1.8, 0.15 + b.high * 2.4].map((v) => Math.min(1, v * (0.6 + b.level)))
        else { const s = 0.45 + 0.25 * Math.sin(t * 3.1) * Math.sin(t * 1.7); target = [s, s * 0.85, s * 0.7] }
      } else if (m === 'listening') {
        const l = micLevel()
        target = [0.1 + l * 0.95, 0.08 + l * 0.8, 0.06 + l * 0.65]
      } else if (m === 'thinking') {
        target = [0.3, 0.24, 0.18]
      } else {
        const br = 0.04 + 0.02 * Math.sin(t * 1.4)
        target = [br, br * 0.8, br * 0.6]
      }
      if (reduced) target = target.map((v) => v * 0.6)
      for (let i = 0; i < 3; i++) {
        const k = target[i] > amp[i] ? 0.35 : 0.1          // fast attack, slow release
        amp[i] += (target[i] - amp[i]) * Math.min(1, k * dt * 60)
      }
      you += ((m === 'listening' ? 1 : 0) - you) * Math.min(1, dt * 4)
      sweep = m === 'thinking' ? (sweep + dt * 0.55) % 1.6 : 0

      ctx.clearRect(0, 0, W, H)
      const cy = H / 2
      const maxA = H * 0.44
      const N = Math.max(48, Math.floor(W / 4))

      for (let li = LAYERS.length - 1; li >= 0; li--) {
        const L = LAYERS[li]
        const col = mixRGB(AI_PALETTE[li], YOU_PALETTE[li], you)
        const A = maxA * Math.min(1, amp[li] * L.gain)
        const ys: number[] = []
        for (let j = 0; j <= N; j++) {
          const x = (j / N) * 2 - 1                                   // -1 … 1
          let env = Math.pow(1 - x * x, 2)                            // taper to the edges
          if (m === 'thinking') env *= 0.55 + 0.9 * Math.exp(-Math.pow((x - (-1.3 + sweep * 1.6)) * 2.2, 2))   // light sweeps left → right
          const f = 0.62 * Math.sin(L.k1 * x * Math.PI + L.w1 * t + L.p) + 0.38 * Math.sin(L.k2 * x * Math.PI + L.w2 * t + L.p * 1.7)
          ys.push(A * env * Math.abs(f) + 0.6)
        }
        const grad = ctx.createLinearGradient(0, 0, W, 0)
        grad.addColorStop(0, rgba(col, 0))
        grad.addColorStop(0.5, rgba(col, L.alpha))
        grad.addColorStop(1, rgba(col, 0))
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(0, cy)
        for (let j = 0; j <= N; j++) ctx.lineTo((j / N) * W, cy - ys[j])
        for (let j = N; j >= 0; j--) ctx.lineTo((j / N) * W, cy + ys[j] * 0.82)
        ctx.closePath()
        ctx.fill()
        // Bright edge on the top curve.
        const edge = ctx.createLinearGradient(0, 0, W, 0)
        edge.addColorStop(0, rgba(col, 0)); edge.addColorStop(0.5, rgba(col, 0.85)); edge.addColorStop(1, rgba(col, 0))
        ctx.strokeStyle = edge
        ctx.lineWidth = 1.25
        ctx.beginPath()
        for (let j = 0; j <= N; j++) { const X = (j / N) * W, Y = cy - ys[j]; if (j) ctx.lineTo(X, Y); else ctx.moveTo(X, Y) }
        ctx.stroke()
      }
      // Hairline axis.
      const axis = ctx.createLinearGradient(0, 0, W, 0)
      const ac = mixRGB(AI_PALETTE[0], YOU_PALETTE[0], you)
      axis.addColorStop(0, rgba(ac, 0)); axis.addColorStop(0.5, rgba(ac, 0.35)); axis.addColorStop(1, rgba(ac, 0))
      ctx.fillStyle = axis
      ctx.fillRect(0, cy - 0.5, W, 1)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro?.disconnect() }
  }, [height])

  return (
    <div ref={wrapRef} role="img" aria-label={label} style={{ width: '100%', height }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  )
}
