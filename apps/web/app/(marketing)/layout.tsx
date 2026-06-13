import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'

export const metadata: Metadata = {
  title: 'Levl1 — The AI-native talent platform',
  description: 'Hire smarter, evaluate at scale, and build a job-ready workforce. ATS + CRM, autonomous AI voice interviews, and soft-skills coaching in one stack.',
}

const CSS = `
.mkt-container { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.mkt-mobile { display: none; }
@media (max-width: 820px) {
  .mkt-desktop { display: none !important; }
  .mkt-mobile { display: block; }
  .mkt-grid-3, .mkt-grid-2, .mkt-feature { grid-template-columns: 1fr !important; }
  .mkt-grid-foot { grid-template-columns: 1fr 1fr !important; }
  .mkt-h1 { font-size: 34px !important; }
  .mkt-feature { gap: 20px !important; }
  .mkt-feature-rev { direction: ltr !important; }
}
.mkt-h1 { font-size: 48px; line-height: 1.08; letter-spacing: -0.02em; }
.mkt-section { padding: 64px 0; }
`

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
