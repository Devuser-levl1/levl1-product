import type { Metadata } from 'next'
import { CTA, Eyebrow, FeatureRow, ACCENTS } from '@/components/marketing/ui'

const A = ACCENTS.interviews
export const metadata: Metadata = {
  title: 'Levl1 Interviews — Autonomous AI voice interviews agencies trust',
  description: '30-minute AI voice L1 interviews across technical, scenario, behavioral and EQ — human-approved questions, identity verification, and evidence-based white-label reports.',
  openGraph: { title: 'Levl1 Interviews — AI voice L1', description: 'Autonomous first-round interviews your clients actually trust.' },
}

const FEATURES = [
  ['Human-in-the-loop', 'Tech lead + HR approve every question bank, and clients approve the scoring rubric — so results carry weight.'],
  ['Real evaluation', 'Voice, a live code editor and a whiteboard. Candidates are scored only on evidence they actually demonstrate.'],
  ['Identity & integrity', 'Email OTP, photo capture and a live integrity score. The AI flags concerns — it never auto-rejects.'],
  ['White-label ranked reports', 'Your brand, your logo. Ranked candidates with clear L2 recommendations and section breakdowns.'],
  ['Candidate experience', 'WhatsApp invites, self-scheduling, explicit consent and automatic reminders — a smooth, fair process.'],
]

export default function InterviewsPage() {
  return (
    <div>
      <section className="mkt-section" style={{ background: 'linear-gradient(180deg,#F8FAFC,#fff)' }}>
        <div className="mkt-container" style={{ maxWidth: 780, textAlign: 'center' }}>
          <Eyebrow accent={A}>Levl1 Interviews · AI Voice L1</Eyebrow>
          <h1 className="mkt-h1" style={{ fontWeight: 800, margin: '0 0 18px' }}>Autonomous first-round interviews your clients actually trust.</h1>
          <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.6, maxWidth: 640, margin: '0 auto 28px' }}>
            30-minute AI voice interviews across technical, scenario, behavioral and EQ — with human-approved questions, identity verification, and evidence-based reports.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CTA href="mailto:hello@levl1.io?subject=Levl1%20Interviews%20pilot" accent={A}>Book a pilot</CTA>
            <CTA href="mailto:hello@levl1.io?subject=Sample%20report" variant="ghost">See a sample report</CTA>
          </div>
        </div>
      </section>

      <section className="mkt-section"><div className="mkt-container">
        {FEATURES.map(([t, b], i) => (
          <FeatureRow key={t} index={i} title={t} body={b} accent={A} mock={<MockReport label={t} accent={A} />} />
        ))}
      </div></section>

      {/* Trust callout */}
      <section className="mkt-section" style={{ background: '#0F172A' }}>
        <div className="mkt-container" style={{ maxWidth: 760, textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Why agencies trust AI screening</h2>
          <p style={{ fontSize: 16, color: '#94A3B8', lineHeight: 1.7 }}>
            Every question is approved by a human. Every score is backed by what the candidate actually said or did. Identity is verified with OTP and photo, and an integrity score surfaces concerns — but the AI never auto-rejects. You stay in control; the evidence does the convincing.
          </p>
          <div style={{ marginTop: 24 }}><CTA href="mailto:hello@levl1.io?subject=Levl1%20Interviews%20pilot" accent={A}>Book a pilot</CTA></div>
        </div>
      </section>
    </div>
  )
}

function MockReport({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[88, 80, 82, 85].map((n, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden' }}><div style={{ width: `${n}%`, height: '100%', background: accent }} /></div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', width: 28 }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
