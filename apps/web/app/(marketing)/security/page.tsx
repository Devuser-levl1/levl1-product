import type { Metadata } from 'next'
import { Container, Reveal, Eyebrow } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'

export const metadata: Metadata = { title: 'Security & Trust — Levl1', description: 'How Levl1 protects recruiter and candidate data: tenant isolation, encryption, RBAC, audit trails, GDPR alignment and identity verification.' }

const CARDS: [string, string][] = [
  ['Data isolation', 'Strict multi-tenant separation. Every query is scoped to your organisation — no tenant can read another’s data.'],
  ['Encryption', 'Data encrypted in transit (TLS) and at rest. Secrets are never exposed to the client.'],
  ['Access control', 'Role-based access (Admin / Recruiter / Viewer) with audit trails on key actions.'],
  ['GDPR-aligned', 'Consent capture, candidate data rights (access / delete), and clear retention. Candidates are always informed.'],
  ['Identity & integrity', 'OTP and photo verification with an integrity score to deter fraud — the AI never auto-rejects.'],
  ['Working toward SOC 2', 'Formal SOC 2 is on our roadmap. We design to its controls today and will pursue certification as we scale.'],
]
const SUBPROCESSORS: [string, string][] = [['Anthropic', 'AI evaluation & resume scoring'], ['ElevenLabs', 'Voice synthesis (Interviews)'], ['Resend', 'Transactional & campaign email'], ['Cashfree', 'Payments & billing'], ['Render', 'Hosting & managed Postgres']]

export default function Security() {
  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container>
      <Reveal><div style={{ textAlign: 'center', marginBottom: 44 }}><Eyebrow>Security &amp; trust</Eyebrow><h1 className="mk-h2">Built for scale and security.</h1><p style={{ fontSize: 16, color: T.slate, marginTop: 12, maxWidth: 560, marginInline: 'auto' }}>Enterprise talent teams and global agencies trust Levl1 with sensitive candidate data. Here’s how we protect it.</p></div></Reveal>
      <div className="mk-grid-3">
        {CARDS.map(([t, b], i) => (
          <Reveal key={t} delay={(i % 3) * 0.06}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, padding: 22, height: '100%' }}><div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${T.purple},${T.blue})`, marginBottom: 12 }} /><div style={{ fontSize: 16.5, fontWeight: 800, marginBottom: 6 }}>{t}</div><div style={{ fontSize: 14, color: T.slate, lineHeight: 1.6 }}>{b}</div></div></Reveal>
        ))}
      </div>
      <Reveal><div style={{ marginTop: 48, background: T.mist, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Subprocessors</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{SUBPROCESSORS.map(([n, p]) => <div key={n} style={{ display: 'flex', gap: 12, fontSize: 14 }}><span style={{ fontWeight: 700, width: 120 }}>{n}</span><span style={{ color: T.slate }}>{p}</span></div>)}</div>
      </div></Reveal>
    </Container></section>
  )
}
