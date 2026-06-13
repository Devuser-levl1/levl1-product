import type { Metadata } from 'next'
import { Container, Reveal, Eyebrow } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'

export const metadata: Metadata = { title: 'Levl1 Roadmap — Hire & Interviews', description: 'A transparent, dual-product roadmap for Levl1 Hire and Levl1 Interviews. Tentative timelines, honest status.' }

type Status = 'Shipping' | 'In progress' | 'Planned'
const PILL: Record<Status, { bg: string; fg: string }> = { Shipping: { bg: 'rgba(16,185,129,0.12)', fg: '#059669' }, 'In progress': { bg: 'rgba(79,70,229,0.12)', fg: '#4F46E5' }, Planned: { bg: '#EEF0FA', fg: '#64748B' } }

const HIRE: [string, Status, string[]][] = [
  ['Q3 2026', 'Shipping', ['ATS pipeline, AI scoring, CRM (live)', 'Analytics dashboard', 'Email campaigns']],
  ['Q4 2026', 'In progress', ['ATS integrations (Greenhouse, Lever, Workday)', 'Advanced automation & workflows', 'Team analytics & SLAs']],
  ['Q1 2027', 'Planned', ['Open API + webhooks', 'Custom fields & reporting', 'SSO / SAML for enterprise']],
  ['Q2 2027+', 'Planned', ['Marketplace & partner ecosystem', 'Advanced compliance (SOC 2)']],
]
const INT: [string, Status, string[]][] = [
  ['Q3 2026', 'Shipping', ['AI voice interviews (live)', 'Identity verification + reports', 'WhatsApp scheduling']],
  ['Q4 2026', 'In progress', ['Lower-latency realtime voice', 'Question bank regrooming v2', 'Multi-language interviews']],
  ['Q1 2027', 'Planned', ['Panel co-pilot (live human + AI)', 'Role-specific evaluation templates', 'Coding-environment expansion']],
  ['Q2 2027+', 'Planned', ['Adaptive interviewing', 'Deeper analytics on evaluation quality']],
]

function Col({ title, accent, phases }: { title: string; accent: string; phases: [string, Status, string[]][] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: accent, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {phases.map(([q, st, items], i) => (
          <Reveal key={q} delay={i * 0.05}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><span style={{ fontSize: 14, fontWeight: 800 }}>{q}</span><span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: PILL[st].bg, color: PILL[st].fg }}>{st}</span></div>
            {items.map((it) => <div key={it} style={{ fontSize: 13.5, color: '#475569', padding: '4px 0', lineHeight: 1.4 }}>• {it}</div>)}
          </div></Reveal>
        ))}
      </div>
    </div>
  )
}

export default function Roadmap() {
  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container>
      <Reveal><div style={{ textAlign: 'center', marginBottom: 44 }}><Eyebrow>Roadmap</Eyebrow><h1 className="mk-h2">Where Levl1 is heading.</h1><p style={{ fontSize: 16, color: T.slate, marginTop: 12 }}>Two products, one direction. Dates are tentative and evolve with customer feedback.</p></div></Reveal>
      <div className="mk-grid-2" style={{ gap: 40 }}>
        <Col title="LEVL1 HIRE" accent={T.violet} phases={HIRE} />
        <Col title="LEVL1 INTERVIEWS" accent={T.indigo} phases={INT} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 13.5, color: '#94A3B8' }}>Roadmap is indicative and evolves with customer feedback. Dates are tentative. Request a feature → <a href="mailto:hello@levl1.io" style={{ color: T.purple }}>hello@levl1.io</a></div>
    </Container></section>
  )
}
