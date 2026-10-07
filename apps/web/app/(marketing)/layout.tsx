import type { Metadata, Viewport } from 'next'
import './marketing.css'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CookieBanner } from '@/components/marketing/cookie-banner'
import { RevealObserver, REVEAL_BOOTSTRAP } from '@/components/marketing/motion/reveal-observer'
import { SITE_URL } from '@/config/site'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Levl1 — AI technical interviews and an AI-native ATS',
  description: 'Levl1 Screen runs live, AI-led first-round technical interviews with live coding and a whiteboard. HirePilot is the AI-native ATS + CRM for recruitment teams.',
}

// Marketing pages allow pinch-zoom (the app shell's root viewport disables it).
export const viewport: Viewport = {
  themeColor: '#4F46E5',
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
