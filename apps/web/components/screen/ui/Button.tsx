'use client'

import { forwardRef } from 'react'
import Link from 'next/link'

// ── Button (Screen design system) ──────────────────────────────────────────
// primary   — THE action on a screen/section (one per area)
// secondary — supporting actions (Cancel, Export, Edit)
// tertiary  — low-emphasis inline actions (links-as-buttons, "Add another")
// destructive — irreversible actions (Delete, Remove); never styled primary
// ghost     — icon / toolbar actions
// Placement: page actions top-right (PageHeader), form/modal actions
// bottom-right (ActionBar) with the primary rightmost.

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost'

interface Common {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean            // square icon button — pass aria-label
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export type ButtonProps = Common & React.ButtonHTMLAttributes<HTMLButtonElement>

export function buttonClass({ variant = 'primary', size = 'md', fullWidth, iconOnly }: Common, extra?: string) {
  return ['lv-btn', `lv-btn--${variant}`, size === 'sm' && 'lv-btn--sm', fullWidth && 'lv-btn--full', iconOnly && 'lv-btn--icon', extra].filter(Boolean).join(' ')
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, fullWidth, iconOnly, leftIcon, rightIcon, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass({ variant, size, fullWidth, iconOnly }, className)}
      disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="lv-spinner" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

/** A link that looks like a Button (navigation, downloads). */
export function ButtonLink({ href, variant, size, fullWidth, leftIcon, rightIcon, className, children, ...rest }:
  Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  const cls = buttonClass({ variant, size, fullWidth }, className)
  const inner = <>{leftIcon}{children}{rightIcon}</>
  // Plain <a> for downloads / API URLs / external; Next Link for app routes.
  if (rest.download !== undefined || href.startsWith('/api/') || /^https?:/.test(href)) return <a href={href} className={cls} {...rest}>{inner}</a>
  return <Link href={href} className={cls} {...rest}>{inner}</Link>
}
