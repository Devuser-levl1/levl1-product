import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Reveal, Button, Eyebrow } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { PricingFAQ } from '@/components/marketing/pricing-faq'

export const metadata: Metadata = { title: 'Pricing — Levl1 Hire & Interviews', description: 'Global pricing for Levl1 Hire and Interviews. USD and INR, with an enterprise tier for SSO, SLAs and data residency. 14-day free trial.' }

const TIERS = [
  { name: 'Starter', usd: '$79', inr: '₹4,999', tag: 'Small teams', items: ['5 active jobs', 'AI resume scoring', 'Kanban pipeline + CRM', '2 recruiter seats', 'Email support'] },
  { name: 'Growth', usd: '$199', inr: '₹11,999', tag: 'Scaling teams', popular: true, items: ['25 active jobs', 'Analytics dashboard', 'Bulk import + automation', '8 recruiter seats', 'Priority support'] },
  { name: 'Scale', usd: '$379', inr: '₹22,999', tag: 'High volume', items: ['100 active jobs', 'Advanced analytics + export', 'Email campaigns', '25 recruiter seats', 'Success manager'] },
]

export default function Pricing() {
  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container>
      <Reveal><div style={{ textAlign: 'center', marginBottom: 12 }}><span style={{ fontSize: 12.5, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.12)', borderRadius: 99, padding: '5px 14px' }}>14-day free trial · 5 free AI interviews</span></div>
      <div style={{ textAlign: 'center', marginBottom: 8 }}><Eyebrow>Pricing</Eyebrow></div>
      <h1 className="mk-h2" style={{ textAlign: 'center' }}>Simple pricing, global scale.</h1>
      <p style={{ textAlign: 'center', color: T.slate, margin: '12px 0 44px', fontSize: 16 }}>Shown in USD with INR equivalents. GST-compliant invoices for Indian customers.</p></Reveal>

      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Levl1 Hire</h2>
      <div className="mk-grid-3">
        {TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}><div className="mk-card" style={{ background: '#fff', border: `1px solid ${t.popular ? T.purple : '#E7E9F5'}`, borderRadius: 18, padding: 26, position: 'relative' }}>
            {t.popular && <span style={{ position: 'absolute', top: -11, left: 24, fontSize: 11, fontWeight: 700, color: '#fff', background: `linear-gradient(120deg,${T.purple},${T.blue})`, borderRadius: 99, padding: '4px 12px' }}>★ Popular</span>}
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{t.tag}</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{t.name}</div>
            <div style={{ margin: '10px 0 4px' }}><span style={{ fontSize: 32, fontWeight: 800 }}>{t.usd}</span><span style={{ color: '#94A3B8', fontSize: 14 }}>/mo</span></div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>{t.inr}/mo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>{t.items.map((it) => <div key={it} style={{ fontSize: 13.5, color: '#475569' }}>✓ {it}</div>)}</div>
            <Button href="/hire/signup">Start free</Button>
          </div></Reveal>
        ))}
      </div>

      <div className="mk-grid-2" style={{ marginTop: 36 }}>
        <Reveal><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 18, padding: 26, borderTop: `4px solid ${T.indigo}` }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Levl1 Interviews</div>
          <div style={{ margin: '10px 0 4px' }}><span style={{ fontSize: 26, fontWeight: 800 }}>from $6</span><span style={{ color: '#94A3B8', fontSize: 14 }}> / interview</span></div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>₹400–600 / interview · plans from $199 (₹15,000)/mo</div>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>Human-approved questions, identity verification and white-label evidence reports included.</p>
          <Button href="/contact" variant="ghost">Book a pilot</Button>
        </div></Reveal>
        <Reveal delay={0.1}><div className="mk-card" style={{ background: T.ink, color: '#fff', borderRadius: 18, padding: 26 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Enterprise</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#A9B0D6', margin: '8px 0 12px' }}>Custom</div>
          <p style={{ fontSize: 14, color: '#C7CCEA', lineHeight: 1.6, marginBottom: 16 }}>Both products. SSO/SAML, dedicated infrastructure, SLAs, volume pricing and data residency.</p>
          <Link href="/contact" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', padding: '11px 18px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>Talk to sales</Link>
        </div></Reveal>
      </div>

      <Reveal><div style={{ textAlign: 'center', background: T.mist, borderRadius: 16, padding: '20px 28px', margin: '32px 0 0' }}><span style={{ fontSize: 16, fontWeight: 800 }}>Hire + Interviews together — save ~20%.</span> <Link href="/contact" style={{ color: T.purple, fontWeight: 600 }}>Talk to us →</Link></div></Reveal>

      <h2 className="mk-h2" style={{ textAlign: 'center', margin: '64px 0 24px' }}>Frequently asked questions</h2>
      <PricingFAQ />
    </Container></section>
  )
}
