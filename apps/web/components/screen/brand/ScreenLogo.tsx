/* eslint-disable @next/next/no-img-element -- static brand asset; plain <img> keeps it usable in server + client components without next/image config */

// ── Screen brand mark (Screen-scoped) ───────────────────────────────────────
// "SCREEN / From Levl1" wordmark. Screen-only — Hire and the marketing site keep
// their own Levl1 logo (components/marketing/logo.tsx is shared, so it is not
// changed). Assets: public/brand/screen/
//   screen-wordmark-black.png  light backgrounds
//   screen-wordmark-white.png  dark backgrounds (same mark, inverted)
//   screen-icon.png            square "S" mark (favicon / compact spots)
// Transparent PNGs trimmed from the provided artwork; ratio 947:374 (≈2.53:1).

export const SCREEN_WORDMARK_RATIO = 947 / 374

type Tone = 'dark' | 'light' | 'auto'

/**
 * `tone` = the colour of the INK:
 *   'dark'  → black wordmark (for light surfaces)
 *   'light' → white wordmark (for dark surfaces)
 *   'auto'  → black, switching to white when the Screen dark theme is active
 */
export function ScreenLogo({ height = 28, tone = 'auto', className, style }: { height?: number; tone?: Tone; className?: string; style?: React.CSSProperties }) {
  const width = Math.round(height * SCREEN_WORDMARK_RATIO)
  const img = (src: string, cls?: string) => (
    <img src={src} alt={cls?.includes('--light') ? '' : 'Screen from Levl1'} aria-hidden={cls?.includes('--light') ? true : undefined}
      width={width} height={height} className={cls} draggable={false}
      style={{ height, width: 'auto', display: 'block', objectFit: 'contain', userSelect: 'none' }} />
  )
  if (tone === 'dark') return <span className={className} style={{ display: 'inline-flex', ...style }}>{img('/brand/screen/screen-wordmark-black.png')}</span>
  if (tone === 'light') return <span className={className} style={{ display: 'inline-flex', ...style }}>{img('/brand/screen/screen-wordmark-white.png')}</span>
  return (
    <span className={`screen-logo ${className ?? ''}`} style={{ display: 'inline-flex', ...style }}>
      {img('/brand/screen/screen-wordmark-black.png', 'screen-logo__ink screen-logo__ink--dark')}
      {img('/brand/screen/screen-wordmark-white.png', 'screen-logo__ink screen-logo__ink--light')}
    </span>
  )
}

/** Square "S" mark for compact placements (collapsed sidebar). */
export function ScreenIcon({ size = 28 }: { size?: number }) {
  return <img src="/brand/screen/screen-icon.png" alt="Screen from Levl1" width={size} height={size} draggable={false} style={{ width: size, height: size, display: 'block', borderRadius: 6 }} />
}

/** Route metadata icons for Screen pages. Uses the single Levl1 site icon
 *  (app/favicon.ico, app/apple-icon.png, public/icons) so every page and
 *  product shares one favicon. */
export const SCREEN_ICONS = {
  // /favicon.ico is added automatically from app/favicon.ico.
  icon: [{ url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' }],
  apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
}
