'use client'
import { useState } from 'react'
import { T } from './tokens'

const FAQ: [string, string][] = [
  ['Are interviews included in Hire?', 'No — Levl1 Screen is a separate product you can add anytime. Use either on its own.'],
  ['Why don’t you show prices?', 'Pricing depends on your team size, volume, and which products you use. We tailor a plan to fit — reach out and we’ll be quick and transparent.'],
  ['Can I use Levl1 Screen with my existing ATS?', 'Yes — it’s ATS-agnostic.'],
  ['How fast can we start?', 'Most teams are live the same day.'],
  ['Is my data secure?', 'Encrypted in transit and at rest; tenant-isolated; enterprise data residency available.'],
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
