'use client'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Reveal, T } from '@/components/marketing/ui'

// The agent's name — always in the brand gradient (lighter tints on dark).
export function Lev({ dark = false }: { dark?: boolean }) {
  const g = dark ? 'linear-gradient(90deg,#C4B5FD,#A5B4FC)' : `linear-gradient(90deg,${T.violet},${T.indigo})`
  return <span style={{ background: g, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontWeight: 800 }}>Lev</span>
}

// A benefit-led alternating feature block: headline + one-liner + bullets + real UI mock.
export function FeatureRow({ index, eyebrow, title, value, points, children }: {
  index: number; eyebrow: string; title: React.ReactNode; value: string; points: string[]; children: React.ReactNode
}) {
  const rev = index % 2 === 1
  return (
    <Reveal>
      <div className={`mk-feat ${rev ? 'mk-feat-rev' : ''}`} style={{ margin: '52px 0' }}>
        <div style={{ order: rev ? 2 : 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.violet, marginBottom: 12 }}>{eyebrow}</div>
          <h3 style={{ fontSize: 'clamp(22px,2.6vw,30px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.ink, margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 16.5, color: T.slate, lineHeight: 1.6, margin: '12px 0 16px', maxWidth: 460 }}>{value}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {points.map((p) => (
              <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14.5, color: '#334155' }}>
                <span style={{ color: T.violet, fontWeight: 800, lineHeight: 1.5 }}>✓</span>{p}
              </div>
            ))}
          </div>
        </div>
        <div style={{ order: rev ? 1 : 2 }}>{children}</div>
      </div>
    </Reveal>
  )
}

// Section heading with an eyebrow + big title (+ optional sub).
export function SectionHead({ eyebrow, title, sub, center = true }: { eyebrow?: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal>
      <div style={{ textAlign: center ? 'center' : 'left', maxWidth: center ? 760 : undefined, margin: center ? '0 auto 12px' : '0 0 12px' }}>
        {eyebrow && <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.violet, marginBottom: 14 }}>{eyebrow}</div>}
        <h2 className="mk-h2">{title}</h2>
        {sub && <p style={{ fontSize: 17, color: T.slate, lineHeight: 1.6, marginTop: 14 }}>{sub}</p>}
      </div>
    </Reveal>
  )
}

// Router doorway card — slides in from an edge, lifts on hover.
export function Doorway({ href, side, label, title, points, dark = false }: {
  href: string; side: 'left' | 'right'; label: string; title: string; points: string[]; dark?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, x: side === 'left' ? -60 : 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={href} className="mk-card" style={{
        display: 'block', textDecoration: 'none', borderRadius: 22, padding: '34px 30px', height: '100%',
        background: dark ? 'linear-gradient(160deg,#1A1440,#0B1020)' : '#fff',
        border: dark ? '1px solid rgba(196,181,253,0.22)' : '1px solid #E7E9F5',
        boxShadow: '0 30px 60px -30px rgba(30,27,75,0.4)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? '#C4B5FD' : T.violet, marginBottom: 14 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: dark ? '#fff' : T.ink, marginBottom: 12 }}>{title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {points.map((p) => <div key={p} style={{ fontSize: 14.5, color: dark ? '#C7CCEA' : T.slate }}>· {p}</div>)}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: dark ? '#fff' : T.violet }}>
          Explore <span style={{ transition: 'transform .2s' }}>→</span>
        </div>
      </Link>
    </motion.div>
  )
}
