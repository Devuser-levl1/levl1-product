'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import Link from 'next/link'

import { T } from './tokens'
export { T }

const EASE = [0.22, 1, 0.36, 1] as const

export function Reveal({ children, delay = 0, y = 24 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <motion.div initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  )
}

export function Stagger({ children, gap = 0.08 }: { children: React.ReactNode; gap?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} variants={{ show: { transition: { staggerChildren: gap } } }}>
      {children}
    </motion.div>
  )
}
export function StaggerItem({ children, y = 20 }: { children: React.ReactNode; y?: number }) {
  return <motion.div variants={{ hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}>{children}</motion.div>
}

export function CountUp({ to, prefix = '', suffix = '', duration = 1.6 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? to : 0)
  useEffect(() => {
    if (!inView || reduce) { setN(to); return }
    let raf = 0; const start = performance.now()
    const tick = (t: number) => { const p = Math.min((t - start) / (duration * 1000), 1); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [inView, to, duration, reduce])
  return <span ref={ref}>{prefix}{n}{suffix}</span>
}

export function Button({ href, children, variant = 'primary', onClick }: { href?: string; children: React.ReactNode; variant?: 'primary' | 'ghost' | 'light'; onClick?: () => void }) {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, padding: '13px 24px', borderRadius: 12, textDecoration: 'none', cursor: 'pointer', transition: 'transform .2s ease, box-shadow .2s ease, filter .2s ease', border: 'none' }
  const styles: Record<string, React.CSSProperties> = {
    primary: { ...base, background: `linear-gradient(120deg, ${T.purple}, ${T.indigo} 60%, ${T.blue})`, color: '#fff', boxShadow: '0 10px 30px rgba(109,40,217,0.35)' },
    ghost: { ...base, background: 'rgba(255,255,255,0.7)', color: T.ink, border: '1px solid rgba(15,16,32,0.12)' },
    light: { ...base, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' },
  }
  const cls = 'mk-btn'
  const inner = <span className={cls} style={styles[variant]} onClick={onClick}>{children}</span>
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

export function Eyebrow({ children, color = T.purple }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color, marginBottom: 18 }}>{children}</div>
}

export function GradientText({ children }: { children: React.ReactNode }) {
  return <span style={{ background: `linear-gradient(120deg, ${T.purple}, ${T.blue})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{children}</span>
}

export function Container({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', ...style }}>{children}</div>
}
