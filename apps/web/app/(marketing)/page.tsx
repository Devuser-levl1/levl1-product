import { CTA, ACCENTS } from '@/components/marketing/ui'
import Link from 'next/link'

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 18, padding: 28 }

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mkt-section" style={{ background: 'linear-gradient(180deg,#F8FAFC,#fff)' }}>
        <div className="mkt-container" style={{ textAlign: 'center', maxWidth: 820 }}>
          <h1 className="mkt-h1" style={{ fontWeight: 800, margin: '0 auto 18px' }}>Hire smarter. Evaluate at scale. Build a job-ready workforce.</h1>
          <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.6, maxWidth: 640, margin: '0 auto 28px' }}>
            The AI-native talent platform for recruitment agencies and hiring teams — sourcing, evaluation, and readiness in one stack.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CTA href="/hire/signup">Start free</CTA>
            <CTA href="/roadmap" variant="ghost">See how it works</CTA>
          </div>
          {/* Source → Screen → Place flow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 44, flexWrap: 'wrap' }}>
            {['Source', 'Screen with AI', 'Place'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 22px', fontWeight: 700, color: '#0F172A', boxShadow: '0 2px 10px rgba(15,23,42,0.05)' }}>{s}</div>
                {i < 2 && <span style={{ color: '#7C3AED', fontSize: 20 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ padding: '32px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
        <div className="mkt-container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 18 }}>Built for the 23,500+ staffing agencies India runs on.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ width: 120, height: 40, borderRadius: 8, background: '#F1F5F9', color: '#CBD5E1', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Your agency here</div>)}
          </div>
        </div>
      </section>

      {/* Three products */}
      <section className="mkt-section">
        <div className="mkt-container">
          <h2 style={{ fontSize: 30, fontWeight: 800, textAlign: 'center', margin: '0 0 36px' }}>One platform, three products</h2>
          <div className="mkt-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            <ProductCard accent={ACCENTS.hire} tag="Levl1 Hire" title="AI-powered ATS + CRM" body="Jobs, pipelines, AI candidate scoring, CRM and deals — purpose-built for agencies." href="/hire" cta="Explore Hire" />
            <ProductCard accent={ACCENTS.interviews} tag="Levl1 Interviews" title="Autonomous AI voice L1" body="30-minute interviews, human-approved questions, ranked evidence-based reports." href="/interviews" cta="Explore Interviews" />
            <ProductCard accent={ACCENTS.upword} tag="Upword · Soon" title="AI soft-skills coach" body="Coach candidates to be job-ready and upskill enterprise teams at scale." href="/upword" cta="Learn more" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mkt-section" style={{ background: '#F8FAFC' }}>
        <div className="mkt-container">
          <h2 style={{ fontSize: 30, fontWeight: 800, textAlign: 'center', margin: '0 0 8px' }}>How the platform works</h2>
          <p style={{ textAlign: 'center', color: '#64748B', margin: '0 0 32px' }}>Each product feeds the next on one shared talent graph.</p>
          <div className="mkt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 760, margin: '0 auto' }}>
            {[['1', 'Win & track clients', 'Hire CRM'], ['2', 'Open jobs, source & AI-score candidates', 'Hire ATS'], ['3', 'Screen at scale with AI voice interviews', 'Interviews'], ['4', 'Make candidates job-ready', 'Upword']].map(([n, t, p]) => (
              <div key={n} style={{ ...card, display: 'flex', gap: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#4F46E5', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</div>
                <div><div style={{ fontWeight: 700 }}>{t}</div><div style={{ fontSize: 13, color: '#94A3B8' }}>{p}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Levl1 */}
      <section className="mkt-section">
        <div className="mkt-container">
          <h2 style={{ fontSize: 30, fontWeight: 800, textAlign: 'center', margin: '0 0 32px' }}>Why Levl1</h2>
          <div className="mkt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 820, margin: '0 auto' }}>
            {[['Integrated, not bolted-on', 'Sourcing, screening and readiness share one talent graph — no fragile integrations.'], ['Human-in-the-loop trust', 'Approved question banks, identity verification and integrity scores. AI never auto-rejects.'], ['India-native pricing', '10–20× below Western tools, billed in INR with GST invoicing.'], ['Compounding AI', 'Every interview sharpens evaluation — the platform improves with use.']].map(([t, b]) => (
              <div key={t} style={card}><div style={{ fontWeight: 700, marginBottom: 6 }}>{t}</div><div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{b}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section style={{ background: '#0F172A', padding: '40px 0' }}>
        <div className="mkt-container" style={{ display: 'flex', justifyContent: 'space-around', gap: 20, flexWrap: 'wrap', textAlign: 'center' }}>
          {[['23,500+', 'agencies'], ['13.2%', 'India staffing CAGR'], ['<5 day', 'shortlist'], ['30-min', 'AI interviews']].map(([n, l]) => (
            <div key={l}><div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{n}</div><div style={{ fontSize: 13, color: '#94A3B8' }}>{l}</div></div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mkt-section" style={{ textAlign: 'center' }}>
        <div className="mkt-container">
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 20px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>Start with the product that solves your biggest bottleneck.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CTA href="/hire/signup">Start free</CTA>
            <CTA href="mailto:hello@levl1.io" variant="ghost">Talk to us</CTA>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProductCard({ accent, tag, title, body, href, cta }: { accent: string; tag: string; title: string; body: string; href: string; cta: string }) {
  return (
    <div style={{ ...card, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }}>{tag}</div>
      <h3 style={{ fontSize: 19, fontWeight: 800, margin: '10px 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 18px' }}>{body}</p>
      <Link href={href} style={{ fontSize: 14, fontWeight: 700, color: accent, textDecoration: 'none' }}>{cta} →</Link>
    </div>
  )
}
