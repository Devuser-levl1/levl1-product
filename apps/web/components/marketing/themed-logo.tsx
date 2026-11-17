import { Logo } from './logo'

/** Levl1 wordmark that follows the colour scheme: black on light, white on dark.
 *  Both variants render; CSS (.mk-logo-light / .mk-logo-dark) shows one.
 *  `priority` applies to both, so whichever is visible loads eagerly. */
export function ThemedLogo({ height = 24, priority = false }: { height?: number; priority?: boolean }) {
  return (
    <span className="inline-flex">
      <span className="mk-logo-light"><Logo variant="black" height={height} priority={priority} /></span>
      <span className="mk-logo-dark"><Logo variant="white" height={height} priority={priority} /></span>
    </span>
  )
}
