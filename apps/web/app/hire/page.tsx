import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CookieBanner } from '@/components/marketing/cookie-banner'
import { Container, Reveal, Button, Eyebrow, GradientText } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { KanbanMock, ScorecardMock, DealPipelineMock, ApplyFormMock } from '@/components/marketing/mocks'

export const metadata: Metadata = {
  title: 'Levl1 Hire — AI-powered ATS + CRM for global talent teams',
  description: 'Source, score and move candidates through a pipeline that is intelligent by default, with a built-in CRM for clients and deals. For agencies and enterprise teams worldwide.',
  openGraph: { title: 'Levl1 Hire — ATS + CRM', description: 'The hiring pipeline that thinks with you.' },
}

const FEATURES: [string, string, React.ReactNode][] = [
  ['AI resume scoring', 'Every applicant scored 0–100 in seconds, with a skills match and a clear recommendation — so the best candidates surface immediately.', <ScorecardMock key="a" />],
  ['Smart pipelines', 'Custom stages, drag-and-drop, and bulk actions. Conversion stats per stage tell you where candidates stall.', <KanbanMock key="b" />],
  ['Built-in CRM', 'Track clients, contacts and a deal pipeline with revenue forecasting — your whole business in one place.', <DealPipelineMock key="c" />],
  ['Public apply pages', 'Branded apply links that score every applicant the moment they submit. No copy-paste, no delay.', <ApplyFormMock key="d" />],
]

export default function HireMarketing() {
  return (
    <div className="mk-wrap" style={{ background: '#fff' }}>
      <MarketingNav />
      <main>
        <section style={{ position: 'relative', overflow: 'hidden', paddingTop: 150, paddingBottom: 80, background: 'linear-gradient(180deg,#FAF5FF,#fff)' }}>
          <div className="mk-blob" style={{ width: 420, height: 420, background: '#C4B5FD', top: -120, right: -80 }} />
          <Container style={{ position: 'relative' }}>
            <div className="mk-grid-2" style={{ alignItems: 'center', gap: 48 }}>
              <div>
                <Reveal><Eyebrow color={T.violet}>Levl1 Hire · Applicant tracking + CRM</Eyebrow></Reveal>
                <Reveal delay={0.1}><h1 className="mk-h1">The hiring pipeline that <GradientText>thinks with you.</GradientText></h1></Reveal>
                <Reveal delay={0.2}><p style={{ fontSize: 18, color: T.slate, lineHeight: 1.6, maxWidth: 500, margin: '20px 0 28px' }}>Source, score, and move candidates through a pipeline that&apos;s intelligent by default — with a built-in CRM to manage clients and deals. For agencies and enterprise teams.</p></Reveal>
                <Reveal delay={0.3}><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><Button href="/contact">Book a demo</Button><Button href="/hire/signup" variant="ghost">Start free</Button></div></Reveal>
              </div>
              <Reveal delay={0.2}><KanbanMock /></Reveal>
            </div>
          </Container>
        </section>

        <section className="mk-section"><Container>
          {FEATURES.map(([title, body, mock], i) => (
            <Reveal key={i}><div className={`mk-feat ${i % 2 ? 'mk-feat-rev' : ''}`} style={{ margin: '40px 0' }}>
              <div style={{ order: i % 2 ? 2 : 1 }}><div style={{ fontSize: 13, fontWeight: 800, color: T.violet }}>{String(i + 1).padStart(2, '0')}</div><h3 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 12px' }}>{title}</h3><p style={{ fontSize: 16, color: T.slate, lineHeight: 1.65 }}>{body}</p></div>
              <div style={{ order: i % 2 ? 1 : 2 }}>{mock}</div>
            </div></Reveal>
          ))}
        </Container></section>

        <section className="mk-section" style={{ background: T.mist }}><Container>
          <Reveal><div style={{ textAlign: 'center', marginBottom: 32 }}><Eyebrow color={T.violet}>One click to AI screening</Eyebrow><h2 className="mk-h2">Plugs into Levl1 Interviews.</h2><p style={{ fontSize: 16, color: T.slate, maxWidth: 560, margin: '14px auto 0' }}>Trigger an autonomous AI interview from any candidate. The evidence-based score syncs straight back into the pipeline.</p></div></Reveal>
          <Reveal><div style={{ maxWidth: 560, margin: '0 auto' }}><ScorecardMock /></div></Reveal>
        </Container></section>

        <section className="mk-section"><Container style={{ maxWidth: 900 }}>
          <Reveal><h2 className="mk-h2" style={{ textAlign: 'center', marginBottom: 28 }}>Why not a spreadsheet — or a legacy ATS?</h2></Reveal>
          <Reveal><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 16, overflow: 'hidden', minWidth: 560, boxShadow: '0 20px 40px -25px rgba(30,27,75,0.25)' }}>
            <thead><tr style={{ background: T.ink, color: '#fff' }}>{['', 'Spreadsheets', 'Legacy ATS', 'Levl1 Hire'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontSize: 13 }}>{h}</th>)}</tr></thead>
            <tbody>{[['Intelligence', 'None', 'Add-on', 'AI scoring, every applicant'], ['Speed', 'Manual', 'Slow rollout', 'Live in minutes'], ['Cost', 'Hidden in time', 'Per-seat, steep', 'Flat, transparent'], ['Scale', 'Breaks fast', 'Enterprise-heavy', 'Agencies → enterprise']].map((r) => (
              <tr key={r[0]} style={{ borderTop: '1px solid #EEF0FA' }}><td style={{ padding: '13px 16px', fontWeight: 700, fontSize: 13.5 }}>{r[0]}</td><td style={{ padding: '13px 16px', fontSize: 13.5, color: '#64748B' }}>{r[1]}</td><td style={{ padding: '13px 16px', fontSize: 13.5, color: '#64748B' }}>{r[2]}</td><td style={{ padding: '13px 16px', fontSize: 13.5, color: '#0F172A', fontWeight: 600 }}>{r[3]}</td></tr>
            ))}</tbody>
          </table></div></Reveal>
          <div style={{ textAlign: 'center', marginTop: 32 }}><Button href="/hire/signup">Start free</Button> <Link href="/contact" style={{ marginLeft: 10, fontSize: 15, fontWeight: 600, color: T.violet }}>Book a demo →</Link></div>
        </Container></section>
      </main>
      <MarketingFooter />
      <CookieBanner />
    </div>
  )
}
