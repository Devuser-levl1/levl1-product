'use client'
import { useEffect, useRef, useState } from 'react'

// Restrained palette — purple/blue + neutrals; amber/red are the attention accents.
export const VIZ = {
  primary: '#6D28D9', primarySoft: 'rgba(109,40,217,0.10)',
  blue: '#2563EB', good: '#059669',
  warn: '#D97706', warnSoft: 'rgba(217,119,6,0.12)',
  bad: '#DC2626', badSoft: 'rgba(220,38,38,0.10)',
  ink: '#0F172A', slate: '#475569', faint: '#94A3B8', line: '#E2E8F0', track: '#F1F5F9',
}

/** Animate a number 0 → value on mount (count-up). Respects reduced motion. */
export function useCountUp(value: number, ms = 700): number {
  const [n, setN] = useState(0)
  const raf = useRef<number>()
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(value); return }
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(value * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setN(value)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, ms])
  return n
}

export function CountUp({ value, decimals = 0, suffix = '', prefix = '' }: { value: number; decimals?: number; suffix?: string; prefix?: string }) {
  const n = useCountUp(value)
  return <>{prefix}{n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>
}

/** Tiny inline-SVG sparkline with a soft gradient fill. */
export function Sparkline({ data, color = VIZ.primary, width = 96, height = 30 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length === 0) return <svg width={width} height={height} />
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const stepX = data.length > 1 ? width / (data.length - 1) : width
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / span) * (height - 4) - 2])
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const gid = `sg-${Math.round(width)}-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.6} fill={color} />
    </svg>
  )
}

/** Direction arrow + delta %, coloured by whether the move is good or bad. */
export function Delta({ cur, prev, betterWhenLower = false, suffix = '%' }: { cur: number | null; prev: number | null; betterWhenLower?: boolean; suffix?: string }) {
  if (cur == null || prev == null || prev === 0) return <span style={{ fontSize: 12, color: VIZ.faint }}>—</span>
  const diffPct = Math.round(((cur - prev) / prev) * 100)
  if (diffPct === 0) return <span style={{ fontSize: 12, color: VIZ.faint }}>→ no change</span>
  const up = diffPct > 0
  const good = betterWhenLower ? !up : up
  const color = good ? VIZ.good : VIZ.bad
  return <span style={{ fontSize: 12, fontWeight: 700, color }}>{up ? '▲' : '▼'} {Math.abs(diffPct)}{suffix} <span style={{ fontWeight: 500, color: VIZ.faint }}>vs last</span></span>
}

/** A horizontal bar that grows from 0 on mount. */
export function GrowBar({ pct, color = VIZ.primary, height = 8, delay = 0 }: { pct: number; color?: string; height?: number; delay?: number }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(Math.max(0, Math.min(100, pct))), 40 + delay); return () => clearTimeout(t) }, [pct, delay])
  return <div style={{ height, borderRadius: 5, background: VIZ.track, overflow: 'hidden' }}><div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} /></div>
}
