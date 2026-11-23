/* eslint-disable @next/next/no-img-element -- static brand asset; plain <img> keeps it usable in server + client components without next/image config */

import { SITE_ICONS } from '@/lib/brand/site-icons'

// ── Product brand mark ──────────────────────────────────────────────────────
// The app (sign-in, sign-up, dashboard sidebar, candidate, report and approval
// pages) shows the Levl1 wordmark — the same artwork as the marketing site
// (components/marketing/logo.tsx). The old "SCREEN / From Levl1" mark is
// retired; its files in public/brand/screen/ are kept only so links in emails
// already sent keep resolving.
// Assets: public/brand/levl1-wordmark-{black,white}.png (900×322, transparent),
//         public/brand/levl1-icon.png (square mark).
// Export names are unchanged so existing callers keep working.

export const SCREEN_WORDMARK_RATIO = 900 / 322

// Callers size the logo for the old two-line mark; the one-line Levl1
// wordmark reads at about 70% of that height.
const LEVL1_SCALE = 0.7

type Tone = 'dark' | 'light' | 'auto'

/**
 * `tone` = the colour of the INK:
 *   'dark'  → black wordmark (for light surfaces)
 *   'light' → white wordmark (for dark surfaces)
 *   'auto'  → black, switching to white when the app's dark theme is active
 */
export function ScreenLogo({ height = 28, tone = 'auto', className, style }: { height?: number; tone?: Tone; className?: string; style?: React.CSSProperties }) {
  const h = Math.round(height * LEVL1_SCALE)
  const width = Math.round(h * SCREEN_WORDMARK_RATIO)
  const img = (src: string, cls?: string) => (
    <img src={src} alt={cls?.includes('--light') ? '' : 'Levl1'} aria-hidden={cls?.includes('--light') ? true : undefined}
      width={width} height={h} className={cls} draggable={false}
      style={{ height: h, width: 'auto', display: 'block', objectFit: 'contain', userSelect: 'none' }} />
  )
  if (tone === 'dark') return <span className={className} style={{ display: 'inline-flex', ...style }}>{img('/brand/levl1-wordmark-black.png')}</span>
  if (tone === 'light') return <span className={className} style={{ display: 'inline-flex', ...style }}>{img('/brand/levl1-wordmark-white.png')}</span>
  return (
    <span className={`screen-logo ${className ?? ''}`} style={{ display: 'inline-flex', ...style }}>
      {img('/brand/levl1-wordmark-black.png', 'screen-logo__ink screen-logo__ink--dark')}
      {img('/brand/levl1-wordmark-white.png', 'screen-logo__ink screen-logo__ink--light')}
    </span>
  )
}

/** Square Levl1 mark for compact placements (collapsed sidebar). */
export function ScreenIcon({ size = 28 }: { size?: number }) {
  return <img src="/brand/levl1-icon.png" alt="Levl1" width={size} height={size} draggable={false} style={{ width: size, height: size, display: 'block', borderRadius: 6 }} />
}

/** Route metadata icons for Screen pages — the single, versioned Levl1 site
 *  icon set (lib/brand/site-icons.ts), so every page and product shares one
 *  favicon and a version bump reaches every browser (incl. Safari's cache). */
export const SCREEN_ICONS = SITE_ICONS
