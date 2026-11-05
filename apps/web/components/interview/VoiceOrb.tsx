'use client'

import { useEffect, useRef } from 'react'

// ── VoiceOrb — the AI interviewer's voice animation (Screen-scoped) ────────
// A glass sphere with soft, drifting light inside (cyan / violet / magenta /
// amber) and a few luminous ribbons. `energy` (0–1) drives motion speed,
// blob spread and ribbon amplitude, so the orb is calm while idle, gently
// alive while listening and most animated while the interviewer speaks.
//
// Pure Canvas 2D (no WebGL / no blur filters) so it stays cheap next to the
// camera + CV pipeline. Honors prefers-reduced-motion. Presentation only —
// it reads nothing but its props.

const BLOBS = [
  { rgb: '56,189,248',  w1: 0.83, w2: 0.61, p: 0.0 },   // cyan
  { rgb: '139,92,246',  w1: 0.57, w2: 0.92, p: 2.1 },   // violet
  { rgb: '236,72,153',  w1: 0.71, w2: 0.49, p: 4.2 },   // magenta
  { rgb: '245,158,11',  w1: 0.44, w2: 0.77, p: 1.3 },   // amber
]
// Open, tapered arcs (not closed loops) — read as flowing light, not outlines.
const RIBBONS = [
  { rgb: '125,211,252', k1: 3, k2: 5, s1: 0.9,  s2: 0.6,  rot: 0.25,  amp: 0.14, span: 1.5, off: 0.0 },
  { rgb: '165,180,252', k1: 2, k2: 4, s1: 0.7,  s2: 1.1,  rot: -0.18, amp: 0.18, span: 1.2, off: 2.2 },
  { rgb: '252,211,77',  k1: 4, k2: 3, s1: 1.2,  s2: 0.5,  rot: 0.12,  amp: 0.12, span: 0.9, off: 4.0 },
  { rgb: '240,171,252', k1: 3, k2: 2, s1: 0.6,  s2: 0.9,  rot: -0.3,  amp: 0.16, span: 1.0, off: 1.1 },
]

export function VoiceOrb({ energy, size = 170, label }: { energy: number; size?: number; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const energyRef = useRef(energy)
  energyRef.current = Math.max(0, Math.min(1, energy))

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const S = size
    canvas.width = Math.round(S * dpr)
    canvas.height = Math.round(S * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const C = S / 2
    const R = S * 0.38            // sphere radius (room left for the halo)
    let e = energyRef.current     // smoothed energy
    let t = 0
    let last = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      e += (energyRef.current - e) * Math.min(1, dt * 3)              // ease toward target
      t += dt * (0.35 + e * 1.5) * (reduced ? 0.25 : 1)

      ctx.clearRect(0, 0, S, S)

      // Soft outer halo (subtle on a white page).
      const halo = ctx.createRadialGradient(C, C, R * 0.9, C, C, R * 1.3)
      halo.addColorStop(0, `rgba(59,130,246,${0.16 + e * 0.14})`)
      halo.addColorStop(1, 'rgba(59,130,246,0)')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(C, C, R * 1.3, 0, Math.PI * 2); ctx.fill()

      ctx.save()
      ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2); ctx.clip()

      // Deep glass body.
      const body = ctx.createRadialGradient(C, C - R * 0.2, R * 0.1, C, C, R)
      body.addColorStop(0, '#1B2A6B')
      body.addColorStop(1, '#070B22')
      ctx.fillStyle = body
      ctx.fillRect(C - R, C - R, R * 2, R * 2)

      // Drifting light.
      ctx.globalCompositeOperation = 'screen'
      const spread = R * (0.16 + e * 0.2)
      for (const b of BLOBS) {
        const x = C + Math.sin(t * b.w1 + b.p) * spread
        const y = C + Math.cos(t * b.w2 + b.p * 1.3) * spread
        const r = R * (0.42 + 0.08 * Math.sin(t * 1.3 + b.p) + e * 0.12)
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(${b.rgb},${0.8 + e * 0.2})`)
        g.addColorStop(0.45, `rgba(${b.rgb},${0.35 + e * 0.15})`)
        g.addColorStop(1, `rgba(${b.rgb},0)`)
        ctx.fillStyle = g
        ctx.fillRect(C - R, C - R, R * 2, R * 2)
      }

      // Luminous core.
      const cx = C + Math.sin(t * 0.9) * R * 0.08, cy = C - R * 0.05 + Math.cos(t * 0.7) * R * 0.08
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.3 + e * 0.12))
      core.addColorStop(0, `rgba(236,254,255,${0.55 + e * 0.35})`)
      core.addColorStop(1, 'rgba(236,254,255,0)')
      ctx.fillStyle = core
      ctx.fillRect(C - R, C - R, R * 2, R * 2)

      // Luminous ribbons — open arcs that fade at both ends.
      ctx.lineCap = 'round'
      for (const rb of RIBBONS) {
        const rot = t * rb.rot * 2 + rb.off
        const N = 40   // segments per arc — enough for smooth curves, cheap next to the CV pipeline
        const pts: [number, number][] = []
        for (let i = 0; i <= N; i++) {
          const a = rot + (i / N) * Math.PI * rb.span
          const rr = R * (0.46 + rb.amp * (0.5 + e) * Math.sin(rb.k1 * a + t * rb.s1) + 0.07 * Math.sin(rb.k2 * a - t * rb.s2))
          pts.push([C + rr * Math.cos(a), C + rr * Math.sin(a) * (0.8 + 0.12 * Math.sin(t * 0.7 + rb.off))])
        }
        for (const [w, alpha] of [[4, 0.12 + e * 0.12], [1.3, 0.6 + e * 0.35]] as const) {
          for (let i = 1; i <= N; i++) {
            const fade = Math.sin((i / N) * Math.PI)          // 0 at the ends → 1 mid-arc
            ctx.strokeStyle = `rgba(${rb.rgb},${alpha * fade})`
            ctx.lineWidth = w * (0.4 + 0.6 * fade)
            ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke()
          }
        }
      }

      // Glass highlight.
      ctx.globalCompositeOperation = 'source-over'
      const hl = ctx.createRadialGradient(C - R * 0.38, C - R * 0.45, 0, C - R * 0.38, C - R * 0.45, R * 0.7)
      hl.addColorStop(0, 'rgba(255,255,255,0.22)')
      hl.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = hl
      ctx.fillRect(C - R, C - R, R * 2, R * 2)
      ctx.restore()

      // Rim.
      ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(59,130,246,${0.25 + e * 0.15})`; ctx.lineWidth = 5; ctx.stroke()
      ctx.strokeStyle = 'rgba(96,165,250,0.95)'; ctx.lineWidth = 1.4; ctx.stroke()

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <canvas ref={canvasRef} role="img" aria-label={label ?? 'AI interviewer voice'}
      style={{ width: size, height: size, display: 'block' }} />
  )
}
