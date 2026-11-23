import type { Metadata } from 'next'

// ── Site icons: ONE declaration for the whole app ──────────────────────────
// Safari keeps its own long-lived favicon / touch-icon cache and rarely
// re-checks an unchanged URL, so after the L1 icon change (2026-11-05) Safari
// kept showing the old mark while Chrome updated. Every icon URL therefore
// carries ICON_VERSION: bump it whenever the artwork changes and every browser
// sees a NEW URL and refetches.
//   /favicon.ico, /apple-touch-icon.png (+ -precomposed) also exist unversioned
//   in public/ because Safari / iOS request those root paths directly.
//   safari-pinned-tab.svg — Safari pinned-tab mask icon (single colour).
// Files: public/{favicon.ico, icon.png, apple-icon.png, apple-touch-icon*.png, safari-pinned-tab.svg}
export const ICON_VERSION = 'l1-20261105'
const v = (path: string) => `${path}?v=${ICON_VERSION}`

export const SITE_ICONS: NonNullable<Metadata['icons']> = {
  icon: [
    { url: v('/favicon.ico'), sizes: 'any' },
    { url: v('/icon.png'), type: 'image/png', sizes: '512x512' },
  ],
  shortcut: [{ url: v('/favicon.ico') }],
  apple: [{ url: v('/apple-touch-icon.png'), sizes: '180x180', type: 'image/png' }],
  other: [{ rel: 'mask-icon', url: v('/safari-pinned-tab.svg'), color: '#4F46E5' }],
}
