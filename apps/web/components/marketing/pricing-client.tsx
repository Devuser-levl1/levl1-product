'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Container, Reveal, Button, Eyebrow } from '@/components/marketing/ui'
import { T } from '@/components/marketing/tokens'
import { PricingFAQ } from '@/components/marketing/pricing-faq'

type Cur = 'INR' | 'USD'
const sym = (c: Cur) => (c === 'INR' ? '₹' : '$')

const HIRE_TIERS = [
  { name: 'Starter', tag: 'Small teams', inr: '4,999', usd: '79', popular: false,
    limits: ['2 recruiter seats', '5 active jobs', '200 candidates / mo', '25 AI interviews / mo'],
    features: ['AI résumé scoring', 'Kanban pipeline + CRM', 'Public apply pages', 'Email support'] },
  { name: 'Growth', tag: 'Scaling teams', inr: '11,999', usd: '199', popular: true,
    limits: ['8 recruiter seats', '25 active jobs', '1,000 candidates / mo', '100 AI interviews / mo'],
    features: ['Everything in Starter', 'Analytics dashboard', 'Bulk import + automation', 'Email campaigns', 'Priority support'] },
  { name: 'Scale', tag: 'High volume', inr: '22,999', usd: '379', popular: false,
    limits: ['25 recruiter seats', '100 active jobs', '5,000 candidates / mo', '400 AI interviews / mo'],
    features: ['Everything in Growth', 'Advanced analytics + export', 'Dedicated success manager', 'SLAs'] },
]

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

export function PricingClient({ initialCurrency }: { initialCurrency: Cur }) {
  const [cur, setCur] = useState<Cur>(initialCurrency)

  // If no explicit choice yet, geo-detect (client-side, visitor IP) → INR for India.
  useEffect(() => {
    if (getCookie('levl1_currency')) return
    fetch('https://ipapi.co/json/')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.country_code) { const c: Cur = d.country_code === 'IN' ? 'INR' : 'USD'; setCur(c); setCookie('levl1_currency', c) } })
      .catch(() => {})
  }, [])

  function choose(c: Cur) { setCur(c); setCookie('levl1_currency', c) }
  const price = (inr: string, usd: string) => `${sym(cur)}${cur === 'INR' ? inr : usd}`

  return (
    <section className="mk-section" style={{ paddingTop: 130 }}><Container>
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 12 }}><span style={{ fontSize: 12.5, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.12)', borderRadius: 99, padding: '5px 14px' }}>14-day free trial · 5 free AI interviews</span></div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}><Eyebrow>Pricing</Eyebrow></div>
        <h1 className="mk-h2" style={{ textAlign: 'center' }}>Flat-rate pricing. Bring your whole team.</h1>
        <p style={{ textAlign: 'center', color: T.slate, margin: '12px 0 28px', fontSize: 16 }}>Predictable per-tier pricing — never per seat. {cur === 'INR' ? 'GST-compliant invoices for Indian customers.' : 'Billed in USD; INR available for India.'}</p>
      </Reveal>

      {/* Value framing band */}
      <Reveal><div style={{ maxWidth: 820, margin: '0 auto 36px', background: T.ink, color: '#fff', borderRadius: 16, padding: '22px 26px', textAlign: 'center', fontSize: 15.5, lineHeight: 1.65 }}>
        Most hiring tools charge per recruiter, per month — costs balloon as you grow. <strong>Levl1 is flat-rate:</strong> add your whole team for one predictable price. Premium AI capabilities, a fraction of the typical cost.
      </div></Reveal>

      {/* Currency toggle + Hire heading */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Levl1 Hire</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, background: '#F1F5F9', borderRadius: 10, padding: 3 }}>
          {(['INR', 'USD'] as Cur[]).map((c) => (
            <button key={c} onClick={() => choose(c)} aria-pressed={cur === c} style={{ fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: cur === c ? '#fff' : 'transparent', color: cur === c ? T.purple : '#64748B', boxShadow: cur === c ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mk-grid-3">
        {HIRE_TIERS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}><div className="mk-card" style={{ background: '#fff', border: `1px solid ${t.popular ? T.purple : '#E7E9F5'}`, borderRadius: 18, padding: 26, position: 'relative', height: '100%' }}>
            {t.popular && <span style={{ position: 'absolute', top: -11, left: 24, fontSize: 11, fontWeight: 700, color: '#fff', background: `linear-gradient(120deg,${T.purple},${T.blue})`, borderRadius: 99, padding: '4px 12px' }}>★ Most popular</span>}
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>{t.tag}</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{t.name}</div>
            <div style={{ margin: '10px 0 4px' }}><span style={{ fontSize: 32, fontWeight: 800 }}>{price(t.inr, t.usd)}</span><span style={{ color: '#94A3B8', fontSize: 14 }}>/mo</span></div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>Flat rate · billed monthly</div>
            <div style={{ borderTop: '1px solid #EEF0FA', paddingTop: 12, marginBottom: 12 }}>
              {t.limits.map((l) => <div key={l} style={{ fontSize: 13, color: '#334155', fontWeight: 600, padding: '3px 0' }}>{l}</div>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>{t.features.map((f) => <div key={f} style={{ fontSize: 13.5, color: '#475569' }}>✓ {f}</div>)}</div>
            <Button href="/hire/signup">Start free</Button>
          </div></Reveal>
        ))}
      </div>

      {/* Interviews + Enterprise */}
      <div className="mk-grid-2" style={{ marginTop: 36 }}>
        <Reveal><div className="mk-card" style={{ background: '#fff', border: '1px solid #E7E9F5', borderRadius: 18, padding: 26, borderTop: `4px solid ${T.indigo}`, height: '100%' }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Levl1 Interviews</div>
          <div style={{ margin: '10px 0 4px' }}><span style={{ fontSize: 26, fontWeight: 800 }}>from {price('500', '7')}</span><span style={{ color: '#94A3B8', fontSize: 14 }}> / interview</span></div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Pay-as-you-go · or monthly plans from <strong>{price('15,000', '249')}/mo</strong></div>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>Human-approved questions, identity verification and white-label evidence reports included. Use it standalone or alongside Hire.</p>
          <Button href="/contact" variant="ghost">Book a pilot</Button>
        </div></Reveal>
        <Reveal delay={0.1}><div className="mk-card" style={{ background: T.ink, color: '#fff', borderRadius: 18, padding: 26, height: '100%' }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Enterprise</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#A9B0D6', margin: '8px 0 12px' }}>Custom</div>
          <p style={{ fontSize: 14, color: '#C7CCEA', lineHeight: 1.6, marginBottom: 16 }}>Both products. SSO/SAML, dedicated infrastructure, SLAs, data residency and volume pricing.</p>
          <Link href="/contact" style={{ fontSize: 14, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', padding: '11px 18px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>Talk to sales</Link>
        </div></Reveal>
      </div>

      <Reveal><div style={{ textAlign: 'center', background: T.mist, borderRadius: 16, padding: '20px 28px', margin: '32px 0 0' }}><span style={{ fontSize: 16, fontWeight: 800 }}>Hire + Interviews together — save ~20%.</span> <Link href="/contact" style={{ color: T.purple, fontWeight: 600 }}>Talk to us →</Link></div></Reveal>

      {/* Generic comparison */}
      <Reveal><div style={{ marginTop: 56, maxWidth: 820, marginInline: 'auto' }}>
        <h2 className="mk-h2" style={{ textAlign: 'center', fontSize: 'clamp(22px,3vw,30px)', marginBottom: 20 }}>What you&apos;d typically pay</h2>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 14, overflow: 'hidden', minWidth: 560, border: '1px solid #E7E9F5' }}>
          <thead><tr style={{ background: T.ink, color: '#fff' }}>{['', 'Billing model', 'Cost as you grow', 'AI evaluation'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13 }}>{h}</th>)}</tr></thead>
          <tbody>
            {[['Typical per-seat ATS', 'Per recruiter, per month', 'Climbs with headcount', 'Add-on or none'],
              ['Typical AI interview tool', 'Per interview, premium', 'Climbs with volume', 'Core, but pricey'],
              ['Levl1', 'Flat per tier', 'Predictable — team included', 'Included']].map((r, i) => (
              <tr key={r[0]} style={{ borderTop: '1px solid #EEF0FA', background: i === 2 ? 'rgba(109,40,217,0.04)' : '#fff' }}>
                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13.5, color: i === 2 ? T.purple : '#0F172A' }}>{r[0]}</td>
                <td style={{ padding: '12px 16px', fontSize: 13.5, color: '#64748B' }}>{r[1]}</td>
                <td style={{ padding: '12px 16px', fontSize: 13.5, color: '#64748B' }}>{r[2]}</td>
                <td style={{ padding: '12px 16px', fontSize: 13.5, color: i === 2 ? '#0F172A' : '#64748B', fontWeight: i === 2 ? 700 : 400 }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 10 }}>Illustrative of common market structures — not specific vendors.</div>
      </div></Reveal>

      <h2 className="mk-h2" style={{ textAlign: 'center', margin: '64px 0 24px' }}>Frequently asked questions</h2>
      <PricingFAQ />
    </Container></section>
  )
}
