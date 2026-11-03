'use client'

// ── Page structure (Screen design system) ──────────────────────────────────
// Page: standard max width + gutters. PageHeader: title/description left,
// PAGE-LEVEL actions TOP-RIGHT (primary rightmost). ActionBar: form / modal
// footer actions BOTTOM-RIGHT (Cancel then primary), optional left slot for
// destructive / secondary-left actions.

export function Page({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={['lv-page', className].filter(Boolean).join(' ')} style={style}>{children}</div>
}

export function PageHeader({ title, description, actions, eyebrow }: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: React.ReactNode
}) {
  return (
    <header className="lv-page-header">
      <div className="lv-page-header__text">
        {eyebrow && <p className="lv-eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</p>}
        <h1 className="lv-page-title">{title}</h1>
        {description && <p className="lv-page-desc">{description}</p>}
      </div>
      {actions && <div className="lv-page-header__actions">{actions}</div>}
    </header>
  )
}

export function ActionBar({ children, start, style }: { children: React.ReactNode; start?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="lv-actions" style={style}>
      {start && <div className="lv-actions__start">{start}</div>}
      {children}
    </div>
  )
}
