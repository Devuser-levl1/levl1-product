'use client'
import { useState } from 'react'
import { T } from './ui'

const FAQ: [string, string][] = [
  ['How does billing work?', 'Hire plans are billed monthly via Cashfree in INR, or in USD for international customers. Interviews can be pay-per-interview or a monthly plan. Cancel anytime.'],
  ['Is there a free trial?', '14 days free on Hire, plus 5 free AI interviews to evaluate Levl1 Interviews. No card required to start.'],
  ['Do you support enterprise?', 'Yes — the Enterprise tier adds SSO/SAML, dedicated infrastructure, SLAs, volume pricing and data residency. Talk to sales.'],
  ['Which currencies do you support?', 'USD and INR today, with GST-compliant invoicing for Indian customers. More currencies are on the roadmap.'],
  ['How is candidate data secured?', 'Data is isolated per tenant, encrypted in transit and at rest, and never shared across customers. Candidates are informed and consent is captured.'],
  ['Can I switch plans later?', 'Anytime, up or down. Changes apply from your next billing cycle; limits update immediately.'],
]

export function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div style={{ maxWidth: 740, margin: '0 auto' }}>
      {FAQ.map(([q, a], i) => (
        <div key={q} style={{ borderBottom: '1px solid #E7E9F5' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', textAlign: 'left', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16.5, fontWeight: 700, color: '#0B1020' }}>{q}<span style={{ color: T.purple, fontSize: 20 }}>{open === i ? '−' : '+'}</span></button>
          {open === i && <div style={{ paddingBottom: 20, fontSize: 15, color: '#475569', lineHeight: 1.65 }}>{a}</div>}
        </div>
      ))}
    </div>
  )
}
