import Image from 'next/image'

// Brand assets (do not recolor or stretch — switch variant by background).
//  - black-text-logo.png : light backgrounds (header/nav, light sections)
//  - white-text-logo.png : dark backgrounds (footer, navy hero, dark CTA bands)
//  - levl1-icon.png      : standalone L1 mark (favicon, app icon, mobile nav, loading)
// Source wordmarks are 400×150 (≈2.67:1); the icon is 2000×2000 (square).

const WORDMARK_RATIO = 400 / 150

/** Full Levl1 wordmark. `variant` picks black (light bg) or white (dark bg). */
export function Logo({
  variant = 'black',
  height = 28,
  priority = false,
}: {
  variant?: 'black' | 'white'
  height?: number
  priority?: boolean
}) {
  const src = variant === 'white' ? '/brand/white-text-logo.png' : '/brand/black-text-logo.png'
  const width = Math.round(height * WORDMARK_RATIO)
  return (
    <Image
      src={src}
      alt="Levl1"
      width={width}
      height={height}
      priority={priority}
      style={{ height, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  )
}

/** Standalone L1 icon mark — use where the full wordmark doesn't fit. */
export function LogoIcon({ size = 28, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/brand/levl1-icon.png"
      alt="Levl1"
      width={size}
      height={size}
      priority={priority}
      style={{ height: size, width: size, display: 'block', objectFit: 'contain' }}
    />
  )
}
