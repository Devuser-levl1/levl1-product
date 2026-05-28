'use client'

import { useEffect, useRef } from 'react'

interface Props {
  audioLevel?: number   // 0–1, boosts wave amplitude when candidate is speaking
  height?: number       // CSS + coordinate height (default 120)
}

/* ── Wave definitions ─────────────────────────────────────────── */
const WAVES = [
  { freq: 0.020, amp: 30, speed: 0.020, color: '#6366F1', alpha: 0.85, lw: 2.5 },
  { freq: 0.030, amp: 20, speed: 0.030, color: '#7C3AED', alpha: 0.65, lw: 2.0 },
  { freq: 0.015, amp: 25, speed: 0.015, color: '#A78BFA', alpha: 0.45, lw: 1.5 },
  { freq: 0.025, amp: 15, speed: 0.025, color: '#C4B5FD', alpha: 0.30, lw: 1.5 },
] as const

export function WaveformVisualizer({ audioLevel = 0, height = 120 }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const timeRef    = useRef(0)
  const audioRef   = useRef(audioLevel)

  /* Keep audioRef in sync without restarting the RAF loop */
  useEffect(() => { audioRef.current = audioLevel }, [audioLevel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W  = canvas.width   // coordinate width (400)
    const H  = canvas.height  // coordinate height
    const cy = H / 2

    function frame() {
      if (!ctx || !canvas) return
      timeRef.current += 1

      ctx.clearRect(0, 0, W, H)

      /* Soft radial glow */
      const grd = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, W * 0.52)
      grd.addColorStop(0,   'rgba(99,102,241,0.10)')
      grd.addColorStop(0.5, 'rgba(124,58,237,0.05)')
      grd.addColorStop(1,   'rgba(124,58,237,0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, W, H)

      /* Amplitude multiplier: 1.0 idle → 3.2 at full audio */
      const boost = 1 + audioRef.current * 2.2

      for (const w of WAVES) {
        ctx.beginPath()
        ctx.strokeStyle = w.color
        ctx.globalAlpha = w.alpha
        ctx.lineWidth   = w.lw

        for (let x = 0; x <= W; x++) {
          const y = cy + Math.sin(x * w.freq + timeRef.current * w.speed) * w.amp * boost
          if (x === 0) ctx.moveTo(x, y)
          else         ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])  // run once — audioLevel updates flow via ref

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={height}
      style={{ display: 'block', width: '100%', height: height }}
    />
  )
}
