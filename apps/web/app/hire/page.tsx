import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { CTA, Eyebrow, FeatureRow, ACCENTS } from '@/components/marketing/ui'

const A = ACCENTS.hire
export const metadata: Metadata = {
  title: 'Levl1 Hire — AI-powered ATS + CRM for Indian staffing agencies',
  description: 'Manage jobs, pipelines, candidates, clients and deals with AI scoring on every applicant. Move off Excel from Rs 4,999/month.',
  openGraph: { title: 'Levl1 Hire — AI-powered ATS + CRM', description: 'The ATS + CRM built for Indian staffing agencies.' },
}

const FEATURES = [
  ['Jobs & custom pipelines', 'Spin up jobs with public apply pages and pipeline stages you customise per role.'],
  ['AI resume scoring', 'Every applicant is scored 0–100 in seconds, with a skills match and recommendation.'],
  ['Drag-and-drop Kanban', 'Move candidates across stages on a visual board. Bulk-import from CSV or pasted resumes.'],
  ['Built-in CRM', 'Track clients, contacts and a deal pipeline with revenue forecasting — your whole business in one place.'],
  ['Plugs into Levl1 Interviews', 'One click to AI-screen any candidate, with the scorecard synced straight back into the pipeline.'],
]

export default function HireMarketing() {
  return (
    <div style={{ background: '#fff', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <MarketingNav />
      <main>
        <section className="mkt-section" style={{ background: 'linear-gradient(180deg,#FAF5FF,#fff)' }}>
          <div className="mkt-container" style={{ maxWidth: 780, textAlign: 'center' }}>
            <Eyebrow accent={A}>Levl1 Hire · ATS + CRM</Eyebrow>
            <h1 className="mkt-h1" style={{ fontWeight: 800, margin: '0 0 18px' }}>The ATS + CRM built for Indian staffing agencies.</h1>
            <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.6, maxWidth: 640, margin: '0 auto 28px' }}>
              Manage jobs, pipelines, candidates, clients and deals — with AI scoring on every applicant. Move off Excel for Rs 4,999/month.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <CTA href="/hire/signup" accent={A}>Start free trial</CTA>
              <CTA href="/pricing" variant="ghost">See pricing</CTA>
            </div>
          </div>
        </section>

        <section className="mkt-section"><div className="mkt-container">
          {FEATURES.map(([t, b], i) => <FeatureRow key={t} index={i} title={t} body={b} accent={A} mock={<MockBoard accent={A} />} />)}
        </div></section>

        {/* Comparison */}
        <section className="mkt-section" style={{ background: '#F8FAFC' }}>
          <div className="mkt-container" style={{ maxWidth: 880 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', margin: '0 0 28px' }}>Why not a spreadsheet — or a per-seat Western ATS?</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 14, overflow: 'hidden', minWidth: 560 }}>
                <thead><tr style={{ background: '#0F172A', color: '#fff' }}>{['', 'Excel', 'Bullhorn-class', 'Levl1 Hire'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[['Price', 'Free, but manual', '$100+/seat/mo', 'Rs 4,999/mo flat'], ['AI scoring', 'None', 'Add-on', 'Built-in, every applicant'], ['India-fit', 'DIY', 'US-first, USD billing', 'INR + GST, WhatsApp, local pricing']].map((row) => (
                    <tr key={row[0]} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{row[0]}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>{row[1]}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>{row[2]}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#0F172A', fontWeight: 600 }}>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}><CTA href="/hire/signup" accent={A}>Start your 14-day free trial</CTA></div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  )
}

function MockBoard({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
      {['Sourced', 'Screening', 'Interview'].map((s) => (
        <div key={s} style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>{s.toUpperCase()}</div>
          {[0, 1].map((i) => <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: 6, marginBottom: 5 }}><div style={{ height: 5, width: '70%', background: '#E2E8F0', borderRadius: 3 }} /><div style={{ height: 4, width: 18, background: accent, borderRadius: 3, marginTop: 5 }} /></div>)}
        </div>
      ))}
    </div>
  )
}
