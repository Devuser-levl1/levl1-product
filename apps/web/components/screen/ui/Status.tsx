'use client'

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

// ── Status + feedback (Screen design system) ───────────────────────────────
// Badge · Alert (inline message) · EmptyState · Spinner · Skeleton.
// Presentation only — callers keep their own loading/error logic.

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

export function Badge({ tone = 'neutral', dot, children, title }: { tone?: Tone; dot?: boolean; children: React.ReactNode; title?: string }) {
  return <span className={`lv-badge lv-badge--${tone}`} title={title}>{dot && <span className="lv-badge__dot" aria-hidden="true" />}{children}</span>
}

const ALERT_ICON = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle } as const

export function Alert({ tone = 'info', title, children, action, style }: {
  tone?: 'info' | 'success' | 'warning' | 'danger'; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; style?: React.CSSProperties
}) {
  const Icon = ALERT_ICON[tone]
  return (
    <div className={`lv-alert lv-alert--${tone}`} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} style={style}>
      <Icon size={16} className="lv-alert__icon" aria-hidden="true" />
      <div className="lv-alert__body">
        {title && <strong className="lv-alert__title">{title}</strong>}
        {children}
      </div>
      {action && <div className="lv-alert__action">{action}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action, plain }: {
  icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; plain?: boolean
}) {
  return (
    <div className={['lv-empty', plain && 'lv-empty--plain'].filter(Boolean).join(' ')}>
      {icon && <div className="lv-empty__icon" aria-hidden="true">{icon}</div>}
      <h3 className="lv-empty__title">{title}</h3>
      {description && <p className="lv-empty__desc">{description}</p>}
      {action && <div className="lv-empty__action">{action}</div>}
    </div>
  )
}

export function Spinner({ size = 'md', label = 'Loading' }: { size?: 'md' | 'lg'; label?: string }) {
  return <span role="status" aria-label={label} style={{ display: 'inline-flex', color: 'var(--lv-text-muted)' }}><span className={['lv-spinner', size === 'lg' && 'lv-spinner--lg'].filter(Boolean).join(' ')} aria-hidden="true" /></span>
}

/** Skeleton block; `lines` renders a paragraph placeholder. */
export function Skeleton({ width = '100%', height = 14, lines, radius, style }: { width?: number | string; height?: number; lines?: number; radius?: number; style?: React.CSSProperties }) {
  if (lines && lines > 1) {
    return <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }, (_, i) => <span key={i} className="lv-skeleton" style={{ width: i === lines - 1 ? '60%' : '100%', height }} />)}
    </span>
  }
  return <span aria-hidden="true" className="lv-skeleton" style={{ width, height, borderRadius: radius, ...style }} />
}

/** Centered loading block for a whole region (spinner + optional label). */
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 16px', color: 'var(--lv-text-muted)', fontSize: 14 }}>
      <span className="lv-spinner" style={{ color: 'var(--lv-text-muted)' }} aria-hidden="true" /> {label}
    </div>
  )
}
