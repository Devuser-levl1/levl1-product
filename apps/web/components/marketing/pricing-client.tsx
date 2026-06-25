'use client'
import Link from 'next/link'
import { Container, Reveal, Eyebrow } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { PricingFAQ } from '@/components/marketing/pricing-faq'

interface Tier { name: string; tag: string; features: string[]; popular?: boolean }

const HIRE_TIERS: Tier[] = [
  { name: 'Starter', tag: 'For small teams getting started', features: ['AI résumé scoring', 'Pipeline + CRM', 'Public apply pages', 'Email support'] },
  { name: 'Growth', tag: 'For scaling agencies and teams', popular: true, features: ['Everything in Starter', 'AI matching & rubric', 'Analytics', 'Bulk import & automation', 'Email campaigns', 'Priority support'] },
  { name: 'Scale', tag: 'For high-volume recruitment', features: ['Everything in Growth', 'Team management & oversight', 'Advanced analytics & export', 'Sourcing connectors', 'Dedicated success manager', 'SLAs'] },
]

const SCREEN_TIERS: Tier[] = [
  { name: 'Pay-as-you-go', tag: 'Occasional or trial use', features: ['Autonomous AI interviews', 'Human-approved questions', 'Integrity checks', 'Evidence-based reports'] },
  { name: 'Starter', tag: 'Low, steady volume', features: ['Everything in PAYG', 'White-label reports', 'Email + WhatsApp scheduling'] },
  { name: 'Growth', tag: 'Scaling screening', popular: true, features: ['Everything in Starter', 'Lower per-interview rate', 'Analytics', 'Priority processing'] },
  { name: 'Scale', tag: 'High-volume screening', features: ['Everything in Growth', 'Best per-interview rate', 'ATS connectors', 'Dedicated support'] },
]

function TierCard({ t, accent }: { t: Tier; accent: string }) {
  return (
    <div className="mk-card" style={{ background: '#fff', border: `1px solid ${t.popular ? accent : '#E7E9F5'}`, borderRadius: 18, padding: 26, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {t.popular && <span style={{ position: 'absolute', top: -11, left: 24, fontSize: 11, fontWeight: 700, color: '#fff', background: accent, borderRadius: 99, padding: '4px 12px' }}>★ Most popular</span>}
      <div style={{ fontSize: 19, fontWeight: 800 }}>{t.name}</div>
      <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, minHeight: 34 }}>{t.tag}</div>
      <div style={{ margin: '14px 0', fontSize: 18, fontWeight: 800, color: accent }}>Contact for pricing</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18, flex: 1 }}>{t.features.map((f) => <div key={f} style={{ fontSize: 13.5, color: '#475569' }}>✓ {f}</div>)}</div>
      <Link href="/contact" style={{ display: 'block', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#fff', background: accent, padding: '11px 18px', borderRadius: 10, textDecoration: 'none' }}>Contact for pricing</Link>
    </div>
  )
}

export function PricingClient() {
  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 8 }}><Eyebrow>Pricing</Eyebrow></div>
        <h1 className="mk-h2" style={{ textAlign: 'center' }}>Pricing that fits how you hire.</h1>
        <p style={{ textAlign: 'center', color: T.slate, margin: '12px auto 0', fontSize: 16, maxWidth: 620 }}>Levl1 Hire and Levl1 Screen are priced separately — use one or both. Tell us about your team and we&apos;ll tailor a plan.</p>
      </Reveal>

      {/* Levl1 Hire (violet) */}
      <Reveal><div style={{ margin: '44px 0 6px', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: T.purple }}>Levl1 Hire</h2>
        <span style={{ fontSize: 14, color: T.slate }}>Run your entire hiring pipeline. Flat, predictable pricing — never per outcome.</span>
      </div></Reveal>
      <div className="mk-grid-3" style={{ marginTop: 18 }}>
        {HIRE_TIERS.map((t, i) => <Reveal key={t.name} delay={i * 0.08}><TierCard t={t} accent={T.purple} /></Reveal>)}
      </div>

      {/* Levl1 Screen (indigo) */}
      <Reveal><div style={{ margin: '52px 0 6px', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: T.indigo }}>Levl1 Screen</h2>
        <span style={{ fontSize: 14, color: T.slate }}>Pay for the screening you run — standalone or alongside Hire.</span>
      </div></Reveal>
      <div className="mk-grid-2" style={{ marginTop: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', display: 'grid', gap: 16 }}>
        {SCREEN_TIERS.map((t, i) => <Reveal key={t.name} delay={i * 0.06}><TierCard t={t} accent={T.indigo} /></Reveal>)}
      </div>

      {/* Enterprise */}
      <Reveal delay={0.1}><div className="mk-card" style={{ background: T.ink, color: '#fff', borderRadius: 18, padding: 28, marginTop: 36, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Enterprise <span style={{ fontSize: 13, fontWeight: 500, color: '#A9B0D6' }}>· either or both products</span></div>
          <p style={{ fontSize: 14, color: '#C7CCEA', lineHeight: 1.6, margin: '8px 0 0' }}>SSO/SAML, dedicated infrastructure, data residency, volume pricing, SLAs.</p>
        </div>
        <Link href="/contact" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', padding: '11px 20px', borderRadius: 10, textDecoration: 'none' }}>Talk to sales</Link>
      </div></Reveal>

      <h2 className="mk-h2" style={{ textAlign: 'center', margin: '64px 0 24px' }}>Frequently asked questions</h2>
      <PricingFAQ />
    </Container></section>
  )
}
