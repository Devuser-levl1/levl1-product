import type { Metadata } from 'next'
import { CTA, ACCENTS } from '@/components/marketing/ui'
import { PricingFAQ } from '@/components/marketing/pricing-faq'

export const metadata: Metadata = {
  title: 'Pricing — Levl1 Hire & Interviews',
  description: 'Simple INR pricing for Indian teams. Hire from Rs 4,999/month; Interviews from Rs 400/interview or Rs 15,000/month. 14-day free trial.',
}

const HIRE_TIERS = [
  { name: 'Starter', price: '4,999', items: ['Up to 5 active jobs', 'AI resume scoring', 'Kanban pipeline', 'CRM (clients & deals)', 'Email support'] },
  { name: 'Growth', price: '11,999', popular: true, items: ['Up to 20 active jobs', 'Bulk import + campaigns', 'Team roles & invites', 'White-label apply pages', 'Priority support'] },
  { name: 'Scale', price: '22,999', items: ['Unlimited jobs', 'Advanced analytics', 'Multi-client management', 'Interviews bundle discount', 'Dedicated success manager'] },
]

export default function PricingPage() {
  return (
    <div className="mkt-section">
      <div className="mkt-container">
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.12)', borderRadius: 100, padding: '4px 12px' }}>14-day free trial · 5 free interviews</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', margin: '8px 0 6px' }}>Simple, India-native pricing</h1>
        <p style={{ textAlign: 'center', color: '#64748B', margin: '0 0 40px' }}>Billed monthly in INR, with GST invoices. No per-seat surprises.</p>

        {/* Hire tiers */}
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Levl1 Hire</h2>
        <div className="mkt-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {HIRE_TIERS.map((t) => (
            <div key={t.name} style={{ background: '#fff', border: `1px solid ${t.popular ? ACCENTS.hire : '#E2E8F0'}`, borderRadius: 16, padding: 24, position: 'relative' }}>
              {t.popular && <span style={{ position: 'absolute', top: -10, left: 24, fontSize: 11, fontWeight: 700, color: '#fff', background: ACCENTS.hire, borderRadius: 100, padding: '3px 10px' }}>Most popular</span>}
              <div style={{ fontWeight: 800, fontSize: 17 }}>{t.name}</div>
              <div style={{ margin: '8px 0 14px' }}><span style={{ fontSize: 30, fontWeight: 800 }}>Rs {t.price}</span><span style={{ color: '#94A3B8', fontSize: 14 }}>/month</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {t.items.map((it) => <div key={it} style={{ fontSize: 14, color: '#475569' }}>✓ {it}</div>)}
              </div>
              <CTA href="/hire/signup" accent={ACCENTS.hire}>Start free</CTA>
            </div>
          ))}
        </div>

        {/* Interviews + Upword */}
        <div className="mkt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 40 }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, borderTop: `3px solid ${ACCENTS.interviews}` }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Levl1 Interviews</div>
            <div style={{ margin: '8px 0 12px' }}><span style={{ fontSize: 26, fontWeight: 800 }}>Rs 400–600</span><span style={{ color: '#94A3B8', fontSize: 14 }}> / interview</span></div>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>Or monthly plans from <strong>Rs 15,000</strong>. Human-approved questions, identity verification and white-label reports included.</p>
            <CTA href="mailto:hello@levl1.io?subject=Levl1%20Interviews" accent={ACCENTS.interviews}>Book a pilot</CTA>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, borderTop: `3px solid ${ACCENTS.upword}` }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Upword</div>
            <div style={{ margin: '8px 0 12px', fontSize: 20, fontWeight: 800, color: ACCENTS.upword }}>Coming soon</div>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>AI soft-skills coaching for candidates and enterprise teams. Join the waitlist to get early access.</p>
            <CTA href="/upword" variant="ghost">Join waitlist</CTA>
          </div>
        </div>

        {/* Bundle callout */}
        <div style={{ background: '#0F172A', color: '#fff', borderRadius: 16, padding: '24px 28px', marginTop: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Bundle Hire + Interviews — save ~20%</div>
          <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 4 }}>Run sourcing and AI screening on one platform. <a href="mailto:hello@levl1.io?subject=Bundle" style={{ color: '#A5B4FC' }}>Talk to us →</a></div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '56px 0 20px' }}>Frequently asked questions</h2>
        <PricingFAQ />
      </div>
    </div>
  )
}
