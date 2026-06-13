import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Levl1 Roadmap — what we’re shipping next',
  description: 'A public, transparent roadmap for the Levl1 talent platform: now, next, later and expansion.',
}

type Status = 'Shipping' | 'Building' | 'Planned'
const PILL: Record<Status, { bg: string; fg: string }> = {
  Shipping: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  Building: { bg: 'rgba(79,70,229,0.10)', fg: '#4F46E5' },
  Planned: { bg: '#F1F5F9', fg: '#64748B' },
}

const PHASES: { title: string; sub: string; items: [string, Status][] }[] = [
  { title: 'Now', sub: '0–3 months', items: [['Levl1 Hire (live)', 'Shipping'], ['Levl1 Interviews (live)', 'Shipping'], ['Two agency pilots', 'Building'], ['WhatsApp slot-pick', 'Shipping'], ['Reliability hardening', 'Building']] },
  { title: 'Next', sub: '3–9 months', items: [['Upword launch', 'Building'], ['ATS integrations (Greenhouse, Lever)', 'Planned'], ['Low-latency voice', 'Building'], ['Email campaigns', 'Planned']] },
  { title: 'Later', sub: '9–18 months', items: [['Skill assessment library', 'Planned'], ['AI proctoring v2', 'Planned'], ['Verified candidate badges', 'Planned'], ['Multi-language interviews', 'Planned']] },
  { title: 'Expansion', sub: '18 months+', items: [['Job-ready workforce vertical', 'Planned'], ['Talent marketplace', 'Planned'], ['Campus hire-athons', 'Planned'], ['Workforce benchmarking', 'Planned'], ['Outcome-based pricing', 'Planned']] },
]

export default function RoadmapPage() {
  return (
    <div className="mkt-section">
      <div className="mkt-container">
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 6px', textAlign: 'center' }}>Roadmap</h1>
        <p style={{ textAlign: 'center', color: '#64748B', margin: '0 0 36px' }}>Where Levl1 is heading. Indicative, honest, and shaped by customer feedback.</p>
        <div className="mkt-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {PHASES.map((ph) => (
            <div key={ph.title} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{ph.title}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>{ph.sub}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ph.items.map(([label, st]) => (
                  <div key={label}>
                    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>{label}</div>
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: PILL[st].bg, color: PILL[st].fg }}>{st}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="mailto:hello@levl1.io?subject=Roadmap%20request" style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5', textDecoration: 'none' }}>Have a request? Tell us →</a>
          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 16 }}>Roadmap is indicative and evolves with customer feedback.</div>
        </div>
      </div>
    </div>
  )
}
