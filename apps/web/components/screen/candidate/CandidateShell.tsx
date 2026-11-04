'use client'

import { forwardRef } from 'react'

// ── Candidate-facing shell (Screen design system, Pass 3 · group 7) ────────
// Candidate pages are white-labelled: the agency's brand colour drives the
// primary action and accents, while neutrals/surfaces come from the --lv
// tokens. `brand` is always a hex string (agency.brandColor, default #4F46E5)
// so callers can still derive tints from it.

/** Readable text colour on top of an arbitrary brand hex (WCAG relative luminance). */
export function onBrand(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  // Contrast vs white = 1.05/(L+.05); vs ink(#0F172A, L≈.0083) = (L+.05)/.0583 → pick the higher.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0583 ? '#FFFFFF' : '#0F172A'
}

export function CandidateShell({ children, brand, agencyName, logo, width = 560 }: {
  children: React.ReactNode
  brand: string
  agencyName: string
  logo: string | null
  width?: number
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-bg)', padding: '32px 16px', fontFamily: 'var(--lv-font-sans)' }}>
      <div style={{ maxWidth: width, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={agencyName} height={36} style={{ objectFit: 'contain', maxWidth: 160 }} />
          ) : (
            <div aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 6, background: brand, color: onBrand(brand), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {agencyName.charAt(0)}
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)' }}>{agencyName}</div>
        </header>
        <main className="lv-card" style={{ padding: 'clamp(20px, 5vw, 28px)', boxShadow: 'none' }}>
          {children}
        </main>
        <PoweredBy />
      </div>
    </div>
  )
}

export function PoweredBy({ link }: { link?: boolean }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--lv-text-muted)' }}>
      Powered by {link ? <a href="https://levl1.io" style={{ color: 'var(--lv-text-body)', fontWeight: 600, textDecoration: 'none' }}>Levl1</a> : 'Levl1'}
    </div>
  )
}

type BrandButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  brand: string
  loading?: boolean
  leftIcon?: React.ReactNode
  variant?: 'solid' | 'outline'
  fullWidth?: boolean
}

/** Primary candidate action in the agency colour, on the canonical button chassis. */
export const BrandButton = forwardRef<HTMLButtonElement, BrandButtonProps>(function BrandButton(
  { brand, loading, leftIcon, variant = 'solid', fullWidth = true, disabled, style, children, type = 'button', ...rest }, ref,
) {
  const solid = variant === 'solid'
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={['lv-btn', 'lv-btn--brand', fullWidth && 'lv-btn--full'].filter(Boolean).join(' ')}
      style={{
        height: solid ? 48 : 40, fontSize: solid ? 16 : 13, fontWeight: 600,
        background: solid ? brand : 'var(--lv-surface)', color: solid ? onBrand(brand) : brand,
        border: `1px solid ${brand}`, boxShadow: solid ? 'var(--lv-shadow-sm)' : 'none', ...style,
      }}
      {...rest}>
      {loading ? <span className="lv-spinner" aria-hidden="true" /> : leftIcon}
      {children}
    </button>
  )
})
