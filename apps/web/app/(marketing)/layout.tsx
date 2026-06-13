import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CookieBanner } from '@/components/marketing/cookie-banner'

export const metadata: Metadata = {
  title: 'Levl1 — The AI hiring & evaluation platform',
  description: 'Hire the right people, ten times faster. Levl1 evaluates candidates with autonomous AI interviews and runs your entire hiring pipeline — for global staffing firms and enterprise talent teams.',
}

const CSS = `
.mk-wrap { font-family: 'Plus Jakarta Sans', Inter, system-ui, sans-serif; color: #0B1020; background: #fff; -webkit-font-smoothing: antialiased; }
.mk-wrap a { -webkit-tap-highlight-color: transparent; }
.mk-mob { display: none; }
.mk-section { padding: 96px 0; }
.mk-h1 { font-size: clamp(40px, 6.5vw, 72px); line-height: 1.04; letter-spacing: -0.03em; font-weight: 800; }
.mk-h2 { font-size: clamp(28px, 4vw, 44px); line-height: 1.1; letter-spacing: -0.02em; font-weight: 800; }
.mk-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.55; animation: mkdrift 18s ease-in-out infinite; }
@keyframes mkdrift { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.1); } 66% { transform: translate(-30px,20px) scale(0.95); } }
.mk-btn:hover { transform: translateY(-2px); filter: brightness(1.05); box-shadow: 0 16px 40px rgba(109,40,217,0.4) !important; }
.mk-btn:active { transform: translateY(0) scale(0.98); }
.mk-card { transition: transform .25s ease, box-shadow .25s ease; }
.mk-card:hover { transform: translateY(-4px); box-shadow: 0 30px 60px -25px rgba(30,27,75,0.35); }
.mk-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.mk-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 22px; }
.mk-feat { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
@media (max-width: 860px) {
  .mk-desk { display: none !important; }
  .mk-mob { display: block; }
  .mk-section { padding: 64px 0; }
  .mk-grid-2, .mk-grid-3, .mk-feat { grid-template-columns: 1fr !important; gap: 24px !important; }
  .mk-foot { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
  .mk-feat-rev > div:first-child { order: 1 !important; }
}
@media (prefers-reduced-motion: reduce) { .mk-blob { animation: none !important; } * { scroll-behavior: auto !important; } }
`

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
      <CookieBanner />
    </div>
  )
}
