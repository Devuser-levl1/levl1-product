import type { Metadata, Viewport } from 'next'
import './marketing.css'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CookieBanner } from '@/components/marketing/cookie-banner'
import { RevealObserver, REVEAL_BOOTSTRAP } from '@/components/marketing/motion/reveal-observer'
import { SITE_URL } from '@/config/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Levl1 — Technical screening you can actually trust',
  description: 'Levl1 runs rigorous AI technical interviews with live coding and a whiteboard, flags what others miss, and hands your team evidence-backed decisions.',
}

// Marketing pages allow pinch-zoom (the app shell's root viewport disables it).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
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
