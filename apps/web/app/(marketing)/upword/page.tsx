import type { Metadata } from 'next'
import { Eyebrow, ACCENTS } from '@/components/marketing/ui'
import { WaitlistForm } from '@/components/marketing/waitlist-form'

const A = ACCENTS.upword
export const metadata: Metadata = {
  title: 'Upword — AI soft-skills coach (coming soon)',
  description: 'An AI coach for communication and soft skills — for candidates preparing for interviews and enterprises upskilling their teams. Join the waitlist.',
  openGraph: { title: 'Upword — AI soft-skills coach', description: 'Make every candidate job-ready. Coming soon.' },
}

export default function UpwordPage() {
  return (
    <div>
      <section className="mkt-section" style={{ background: 'linear-gradient(180deg,#ECFEFF,#fff)' }}>
        <div className="mkt-container" style={{ maxWidth: 760, textAlign: 'center' }}>
          <Eyebrow accent={A}>Upword · AI Soft-Skills Coach · Coming soon</Eyebrow>
          <h1 className="mkt-h1" style={{ fontWeight: 800, margin: '0 0 18px' }}>Make every candidate job-ready.</h1>
          <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.6, maxWidth: 620, margin: '0 auto 28px' }}>
            An AI coach for communication and soft skills — for candidates preparing for interviews, and for enterprises upskilling their teams.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}><WaitlistForm accent={A} /></div>
        </div>
      </section>

      <section className="mkt-section"><div className="mkt-container">
        <div className="mkt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 820, margin: '0 auto' }}>
          {[['For job-seekers', 'Coach communication, interview readiness and confidence — practice with AI and walk in prepared.'], ['For enterprises', 'Upskill teams in communication, leadership and EQ at scale, with AI practice and measurable progress.']].map(([t, b]) => (
            <div key={t} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 28, borderTop: `3px solid ${A}` }}>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{t}</div>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.6, margin: 0 }}>{b}</p>
            </div>
          ))}
        </div>
      </div></section>

      <section className="mkt-section" style={{ background: '#F8FAFC' }}>
        <div className="mkt-container" style={{ maxWidth: 720, textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>How Upword connects to Levl1</h2>
          <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.7 }}>
            Every Levl1 interview reveals a candidate&apos;s exact skill gaps. Upword closes them — so stronger candidates re-enter the pipeline.
          </p>
        </div>
      </section>
    </div>
  )
}
