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
      {products.length > 1 && <div role="tablist" aria-label="Choose a product" className="flex w-fit rounded-lg border border-mk-line bg-mk-surface p-1">
        {products.map((p, i) => (
          <button key={p.id} ref={(el) => { tabs.current[i] = el }} role="tab" id={`${id}-tab-${p.id}`} aria-selected={active === i} aria-controls={`${id}-panel-${p.id}`}
            tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}
            className={`rounded-md px-5 py-2 text-[0.92rem] font-medium transition-colors ${active === i ? 'bg-mk-mist text-mk-ink' : 'text-mk-muted hover:text-mk-ink'}`}>
            {p.label}
          </button>
        ))}
      </div>}

      {products.map((product, i) => (
      <div key={product.id} hidden={active !== i} className={`mk-menu-enter focus:outline-none ${products.length > 1 ? 'mt-10' : ''}`}
        {...(products.length > 1 ? { role: 'tabpanel', id: `${id}-panel-${product.id}`, 'aria-labelledby': `${id}-tab-${product.id}`, tabIndex: 0 } : {})}>
        <p className="max-w-xl text-mk-slate">{product.summary} <span className="font-semibold text-mk-ink">{product.unit}.</span></p>
        <div className={`mt-10 grid gap-6 ${product.plans.length === 3 ? 'lg:grid-cols-3' : 'max-w-4xl md:grid-cols-2'}`}>
          {product.plans.map((plan) => (
            <div key={plan.id} className={`mk-card relative flex flex-col p-8 ${plan.highlighted ? '!border-mk-accent/50' : ''}`}>
              <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
              <p className="mt-2 min-h-[3rem] text-[0.95rem] leading-relaxed text-mk-muted">{plan.tagline}</p>
              <p className="mt-6 text-[1.25rem] font-semibold tracking-tight text-mk-ink">{plan.price || CONTACT_FOR_PRICING}</p>
              {plan.price && plan.priceNote && <p className="text-sm text-mk-muted">{plan.priceNote}</p>}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.includes.map((f) => (
                  <li key={f} className="flex gap-3 text-[0.95rem] text-mk-slate"><Check aria-hidden className="mt-0.5 h-4 w-4 flex-none text-mk-accent-text" strokeWidth={2.4} />{f}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-2.5">
                <Link href={plan.cta.href} className={`mk-btn ${plan.highlighted ? 'mk-btn-primary' : 'mk-btn-secondary'} w-full`}>{plan.cta.label}</Link>
                {plan.secondaryCta && <Link href={plan.secondaryCta.href} className="py-2 text-center text-sm font-medium text-mk-accent-text hover:underline">{plan.secondaryCta.label}</Link>}
              </div>
            </div>
          ))}
        </div>
      </div>
      ))}
    </div>
  )
}
