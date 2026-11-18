import Image from 'next/image'

// Brand assets (do not recolor or stretch — switch variant by background).
//  - levl1-wordmark-black.png : light backgrounds (header/nav, light sections)
//  - levl1-wordmark-white.png : dark backgrounds (dark mode, dark bands)
// To change the logo, add files under NEW names (browsers cache by URL).
//  - levl1-icon.png      : standalone L1 mark (favicon, app icon, mobile nav, loading)
// Wordmarks are transparent PNGs, 900×322 (≈2.8:1), trimmed to the artwork;
// the icon is square.

const WORDMARK_RATIO = 900 / 322

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
  const src = variant === 'white' ? '/brand/levl1-wordmark-white.png' : '/brand/levl1-wordmark-black.png'
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
