'use client'
import React from 'react'
import { H } from './hire-tokens'

// ── Levl1 Hire shared UI kit ───────────────────────────────────────────────
// One design system across the whole platform. Hire's accent is brand VIOLET
// (#6D28D9 / #7C3AED) — distinct from the Interviews indigo — but the layout,
// radii, shadows, type scale, spacing and interaction patterns are identical.
// Tokens `H` live in the non-client ./hire-tokens so SERVER components can also
// import them; this file re-exports them alongside the client-only primitives.

export { H }

// ── Card ────────────────────────────────────────────────────────────────
export function Card({ children, style, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} style={{ background: H.white, border: `1px solid ${H.border}`, borderRadius: H.radius, padding: 20, boxShadow: H.shadowCard, ...style }}>{children}</div>
}

// ── Button ──────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'ghost' | 'danger'
export function Button({ variant = 'primary', style, children, ...rest }: { variant?: BtnVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: React.CSSProperties = { fontSize: 13, fontWeight: 700, borderRadius: H.radiusBtn, padding: '9px 16px', cursor: rest.disabled ? 'default' : 'pointer', transition: 'all .15s ease', fontFamily: 'inherit', lineHeight: 1.2 }
  const v: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: H.primary, color: '#fff', border: 'none', boxShadow: '0 1px 2px rgba(109,40,217,0.25)' },
    ghost: { background: '#fff', color: H.muted, border: `1px solid ${H.border}` },
    danger: { background: '#fff', color: H.red, border: '1px solid #FECACA' },
  }
  return <button {...rest} style={{ ...base, ...v[variant], ...(rest.disabled ? { opacity: 0.55 } : {}), ...style }}>{children}</button>
}

// ── Input / Select ────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: H.radiusSm, border: `1px solid ${H.border}`, fontSize: 13.5, background: '#fff', color: H.ink, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
export function Input({ style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...rest} style={{ ...fieldStyle, ...style }} /> }
export function Select({ style, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...rest} style={{ ...fieldStyle, ...style }}>{children}</select> }

// ── Badge / pill ────────────────────────────────────────────────────────
export function Badge({ children, color = H.faint, bg = H.borderLight, style }: { children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: H.pill, padding: '3px 10px', display: 'inline-block', ...style }}>{children}</span>
}

// ── Page header ───────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: H.ink, margin: 0, letterSpacing: '-0.01em' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: H.faint, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, hint, action }: { icon?: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <Card style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: H.body }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: H.faint, marginTop: 4, maxWidth: 360, marginInline: 'auto' }}>{hint}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </Card>
  )
}

// ── Modal overlay ─────────────────────────────────────────────────────────
export function Modal({ children, onClose, width = 440 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: H.radius, padding: 24, width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: H.shadowPop }}>{children}</div>
    </div>
  )
}
