'use client'
import { useState } from 'react'
import { T } from './tokens'

const FAQ: [string, string][] = [
  ['How does billing work, and which currencies?', 'Plans are billed monthly. India is billed in INR with GST-compliant invoices; everywhere else in USD. Your region is detected automatically and you can switch the currency toggle anytime.'],
  ['How does the free trial work?', '14 days free on Hire — full features, no card required. You also get 5 free AI interviews to evaluate Levl1 Interviews. Pick a plan whenever you’re ready; nothing auto-charges.'],
  ['Why flat-rate instead of per-seat?', 'Per-seat pricing punishes you for growing your team. Levl1 is flat per tier — add your whole team for one predictable price, with generous limits and clear upgrade paths. No surprise invoices as you scale.'],
  ['Can I use one product without the other?', 'Yes. Levl1 Hire and Levl1 Interviews are standalone products — each delivers full value alone. Connect them when you want an interview to trigger from a pipeline card and the score to flow back. Integration is optional.'],
  ['Do you support enterprise & data residency?', 'The Enterprise tier adds SSO/SAML, dedicated infrastructure, SLAs, volume pricing and data residency options. Talk to sales for a tailored setup.'],
  ['Can I switch plans later?', 'Anytime, up or down. Changes apply from your next billing cycle; usage limits update immediately.'],
  ['How is candidate data secured?', 'Data is isolated per tenant, encrypted in transit and at rest, and never shared across customers. Candidates are informed and consent is captured. See our Security page for details.'],
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
