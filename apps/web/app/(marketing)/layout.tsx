import type { Metadata, Viewport } from 'next'
// Marketing-only fonts (DESIGN.md): display + evidence. Self-hosted.
import '@fontsource/instrument-sans/500.css'
import '@fontsource/jetbrains-mono/400.css'
import './marketing.css'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CookieBanner } from '@/components/marketing/cookie-banner'
import { RevealObserver, REVEAL_BOOTSTRAP } from '@/components/marketing/motion/reveal-observer'
import { SITE_URL } from '@/config/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Levl1 — Interviews that show their work',
  description: 'Levl1 runs the technical first round — live voice, real code, a whiteboard — and hands back the evidence, not just a score.',
}

// Marketing pages allow pinch-zoom (the app shell's root viewport disables it).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0e' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Viewport objects merge with the root's, so these must be set explicitly.
  maximumScale: 5,
  userScalable: true,
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-root">
      <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOTSTRAP }} />
      <MarketingNav />
      <main id="main">{children}</main>
      <MarketingFooter />
      <CookieBanner />
      <RevealObserver />
    </div>
  )
}
