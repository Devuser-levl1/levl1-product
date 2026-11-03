'use client'

import { useId } from 'react'

// ── Checkbox / Radio (Screen design system) ────────────────────────────────
// Same visual language as the consent checkbox fix: a real native input
// (keyboard, screen readers) visually hidden over a 22px high-contrast box, a
// ≥44px hit area, the whole label clickable, visible focus ring.
// variant="card" = the bordered row used for consent and option cards.
// Controlled only (`checked` + `onChange`) — callers decide defaults; consent
// must never default to checked.

interface ChoiceProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children?: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  variant?: 'plain' | 'card'
  name?: string
  value?: string
  id?: string
}

function Choice({ type, checked, onChange, children, description, disabled, variant = 'plain', name, value, id }: ChoiceProps & { type: 'checkbox' | 'radio' }) {
  const uid = useId()
  const inputId = id ?? `lv-c-${uid}`
  return (
    <label htmlFor={inputId} className={['lv-check', variant === 'card' && 'lv-check--card'].filter(Boolean).join(' ')} data-checked={checked} data-disabled={disabled || undefined}>
      <input id={inputId} type={type} className="lv-check__input" checked={checked} disabled={disabled} name={name} value={value}
        onChange={(e) => onChange(e.target.checked)} />
      <span className={`lv-check__box lv-check__box--${type}`} aria-hidden="true">
        {type === 'checkbox' && <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      {(children || description) && (
        <span className="lv-check__text">
          {children}
          {description && <span className="lv-check__desc">{description}</span>}
        </span>
      )}
    </label>
  )
}

export function Checkbox(props: ChoiceProps) { return <Choice type="checkbox" {...props} /> }

/** Radio — use inside a RadioGroup (role=radiogroup) with a shared `name`. */
export function Radio(props: ChoiceProps) { return <Choice type="radio" {...props} /> }

export function RadioGroup({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div role="radiogroup" aria-label={label} className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
}
