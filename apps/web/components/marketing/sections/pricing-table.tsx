'use client'
import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { CONTACT_FOR_PRICING, type PricingProduct } from '@/config/pricing'

// Tabbed plans per product. Prices render only if set in config/pricing.ts.
export function PricingTable({ products, initial = 0 }: { products: PricingProduct[]; initial?: number }) {
  const [active, setActive] = useState(initial)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()

  function onKey(e: React.KeyboardEvent, i: number) {
    const n = products.length
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (next < 0) return
    e.preventDefault(); setActive(next); tabs.current[next]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label="Choose a product" className="mx-auto flex w-fit rounded-full border border-mk-line bg-white p-1.5 shadow-[0_8px_30px_-18px_rgba(49,46,129,0.4)]">
        {products.map((p, i) => (
          <button key={p.id} ref={(el) => { tabs.current[i] = el }} role="tab" id={`${id}-tab-${p.id}`} aria-selected={active === i} aria-controls={`${id}-panel-${p.id}`}
            tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
            className={`rounded-full px-6 py-2.5 text-[0.95rem] font-semibold transition-all duration-300 ${active === i ? 'bg-gradient-to-r from-mk-purple via-mk-indigo to-mk-blue text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.7)]' : 'text-mk-slate hover:text-mk-ink'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {products.map((product, i) => (
      <div role="tabpanel" id={`${id}-panel-${product.id}`} aria-labelledby={`${id}-tab-${product.id}`} key={product.id} hidden={active !== i} tabIndex={0} className="mk-menu-enter mt-10 focus:outline-none">
        <p className="mx-auto max-w-xl text-center text-mk-slate">{product.summary} <span className="font-semibold text-mk-ink">{product.unit}.</span></p>
        <div className={`mt-10 grid gap-6 ${product.plans.length === 3 ? 'lg:grid-cols-3' : 'mx-auto max-w-4xl md:grid-cols-2'}`}>
          {product.plans.map((plan) => (
            <div key={plan.id} className={`mk-card mk-card-hover relative flex flex-col p-8 ${plan.highlighted ? '!border-violet-300 shadow-[0_30px_60px_-34px_rgba(91,33,182,0.55)]' : ''}`}>
              {plan.highlighted && <div aria-hidden className="absolute inset-x-8 top-0 h-[3px] rounded-b-full bg-gradient-to-r from-mk-purple via-mk-indigo to-mk-blue" />}
              <h3 className="text-xl font-extrabold tracking-tight">{plan.name}</h3>
              <p className="mt-2 min-h-[3rem] text-[0.95rem] leading-relaxed text-mk-muted">{plan.tagline}</p>
              <p className="mt-6 text-[1.35rem] font-extrabold tracking-tight text-mk-ink">{plan.price || CONTACT_FOR_PRICING}</p>
              {plan.price && plan.priceNote && <p className="text-sm text-mk-muted">{plan.priceNote}</p>}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.includes.map((f) => (
                  <li key={f} className="flex gap-3 text-[0.95rem] text-mk-slate"><Check aria-hidden className="mt-0.5 h-4 w-4 flex-none text-mk-violet" strokeWidth={2.6} />{f}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-2.5">
                <Link href={plan.cta.href} className={`mk-btn ${plan.highlighted ? 'mk-btn-primary' : 'mk-btn-secondary'} w-full`}>{plan.cta.label}</Link>
                {plan.secondaryCta && <Link href={plan.secondaryCta.href} className="py-2 text-center text-sm font-semibold text-mk-purple hover:text-mk-indigo">{plan.secondaryCta.label}</Link>}
              </div>
            </div>
          ))}
        </div>
      </div>
      ))}
    </div>
  )
}
