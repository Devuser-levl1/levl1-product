'use client'
import { useState } from 'react'

const FAQ: [string, string][] = [
  ['How does billing work?', 'Hire plans are billed monthly in INR via Cashfree. Interviews can be pay-per-interview or a monthly plan. You can cancel anytime.'],
  ['Is there a free trial?', 'Yes — a 14-day free trial on Hire, and 5 free AI interviews to evaluate Levl1 Interviews. No card required to start.'],
  ['Do you provide GST invoices?', 'Yes. Every payment generates a GST-compliant invoice with your business details.'],
  ['Can I switch plans later?', 'Anytime, up or down. Changes apply from your next billing cycle; usage limits update immediately.'],
  ['How is my data secured?', 'Data is isolated per tenant, encrypted in transit, and never shared across customers. Candidate consent and identity verification are built in.'],
]

export function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {FAQ.map(([q, a], i) => (
        <div key={q} style={{ borderBottom: '1px solid #E2E8F0' }}>
          <button onClick={() => setOpen(open === i ? null : i)} style={{ width: '100%', textAlign: 'left', padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
            {q}<span style={{ color: '#94A3B8' }}>{open === i ? '–' : '+'}</span>
          </button>
          {open === i && <div style={{ paddingBottom: 18, fontSize: 15, color: '#475569', lineHeight: 1.6 }}>{a}</div>}
        </div>
      ))}
    </div>
  )
}
