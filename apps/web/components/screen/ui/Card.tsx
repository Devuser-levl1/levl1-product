'use client'

// ── Card (Screen design system) ────────────────────────────────────────────
// One card style: surface, 1px border, 14px radius, small shadow. `title` /
// `subtitle` / `actions` render the standard header (actions top-right).
// `onClick` makes it an interactive card (keyboard-activatable).

export function Card({ title, subtitle, actions, padded = true, onClick, className, style, children, as: As = 'section' }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; padded?: boolean
  onClick?: () => void; className?: string; style?: React.CSSProperties; children?: React.ReactNode
  as?: 'section' | 'div' | 'article'
}) {
  const interactive = !!onClick
  return (
    <As className={['lv-card', padded && 'lv-card--pad', interactive && 'lv-card--interactive', className].filter(Boolean).join(' ')} style={style}
      onClick={onClick} tabIndex={interactive ? 0 : undefined} role={interactive ? 'button' : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!() } } : undefined}>
      {(title || actions) && (
        <div className="lv-card__head">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="lv-card__title">{title}</h3>}
            {subtitle && <p className="lv-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="lv-card__actions">{actions}</div>}
        </div>
      )}
      {children}
    </As>
  )
}

/** Small uppercase section label (the "JOB DESCRIPTION" style headings). */
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p className="lv-eyebrow" style={style}>{children}</p>
}
