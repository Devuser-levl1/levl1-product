import type { Metadata } from 'next'
import { Container, Reveal, Eyebrow } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'

export const metadata: Metadata = { title: 'Levl1 Roadmap — Hire & Interviews', description: 'We build in the open. What’s shipping, what’s in progress, and where Levl1 is going. Timelines are indicative.' }

type Status = 'Shipping now' | 'In progress' | 'Planned'
const PILL: Record<Status, { bg: string; fg: string }> = {
  'Shipping now': { bg: 'rgba(16,185,129,0.12)', fg: '#059669' },
  'In progress': { bg: 'rgba(79,70,229,0.12)', fg: '#4F46E5' },
  Planned: { bg: '#EEF0FA', fg: '#64748B' },
}

const HIRE: [Status, string[]][] = [
  ['Shipping now', ['AI job-brief generation', 'Weighted screening rubric', 'AI résumé scoring & matching (incl. image-PDF reading)', 'Agentic “Ask Levl1” assistant', 'AI sourcing search-strings', 'ATS + CRM pipeline with deal economics', 'Branded career pages']],
  ['In progress', ['Team management & manager oversight', 'Drag-and-drop job assignment', 'Inbound email → draft position', 'One-click job posting (bring-your-own-board)', 'In-app mailbox']],
  ['Planned', ['Least-click sourcing across boards', 'LinkedIn sourcing via extension', 'Talent-pool intelligence & candidate rediscovery', 'Staged agentic recruiter']],
]
const SCREEN: [Status, string[]][] = [
  ['Shipping now', ['Autonomous AI voice interviews', 'Human-approved question banks', 'Live coding & whiteboard', 'Identity verification', 'Evidence-based reports', 'Email + WhatsApp scheduling']],
  ['In progress', ['Lower-latency real-time voice', 'Richer interview analytics']],
  ['Planned', ['Multi-language interviews', 'Fraud / integrity intelligence', 'Psychometric & behavioral assessment module', 'Named ATS connectors']],
]

function Col({ title, accent, groups }: { title: string; accent: string; groups: [Status, string[]][] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: accent, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {groups.map(([st, items], i) => (
          <Reveal key={st} delay={i * 0.05}><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 14, padding: 18 }}>
            <div style={{ marginBottom: 10 }}><span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: PILL[st].bg, color: PILL[st].fg }}>{st}</span></div>
            {items.map((it) => <div key={it} style={{ fontSize: 13.5, color: '#475569', padding: '4px 0', lineHeight: 1.45 }}>• {it}</div>)}
          </div></Reveal>
        ))}
      </div>
    </div>
  )
}

export default function Roadmap() {
  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container>
      <Reveal><div style={{ textAlign: 'center', marginBottom: 44 }}><Eyebrow>Roadmap</Eyebrow><h1 className="mk-h2">Where Levl1 is headed.</h1><p style={{ fontSize: 16, color: T.slate, marginTop: 12, maxWidth: 640, marginInline: 'auto' }}>We build in the open. Here&apos;s what&apos;s shipping, what&apos;s in progress, and where we&apos;re going. Timelines are indicative and evolve with customer feedback.</p></div></Reveal>
      <div className="mk-grid-2" style={{ gap: 40 }}>
        <Col title="LEVL1 HIRE" accent={T.violet} groups={HIRE} />
        <Col title="LEVL1 INTERVIEWS" accent={T.indigo} groups={SCREEN} />
      </div>

      {/* The vision */}
      <Reveal><div style={{ marginTop: 48, background: T.ink, color: '#fff', borderRadius: 18, padding: '30px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#A9B0D6', marginBottom: 10 }}>THE VISION</div>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, marginBottom: 12 }}>Agentic recruiting on top of any system.</h2>
        <p style={{ fontSize: 15.5, color: '#C7CCEA', lineHeight: 1.7, maxWidth: 720, marginInline: 'auto' }}>We&apos;re building toward an AI layer that sources, screens, and shortlists autonomously — with human approval at every gate — and runs on top of the ATS you already use. The system of record stays yours; the intelligence is ours.</p>
      </div></Reveal>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13.5, color: '#94A3B8' }}>Request a feature → <a href="mailto:hello@levl1.io" style={{ color: T.purple }}>hello@levl1.io</a></div>
    </Container></section>
  )
}
