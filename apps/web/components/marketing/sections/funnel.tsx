import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PRODUCTS, PRODUCT_ORDER, type ProductKey } from '@/config/site'
import type { Heading } from '@/content/types'
import { ProductStatusBadge } from './badge'
import { Container, Section, SectionHeading } from './primitives'

// The three-stage technical hiring funnel, read entirely from config/site.ts.
// `current` marks the product page you're on.
export function Funnel({ heading, current, details }: { heading: Heading; current?: ProductKey; details?: Partial<Record<ProductKey, string>> }) {
  return (
    <Section>
      <Container>
        <SectionHeading {...heading} />
        <ol data-reveal className="mk-funnel relative mt-14 grid gap-4 md:grid-cols-3 md:gap-10">
          <div aria-hidden className="mk-funnel-line absolute left-[16%] right-[16%] top-1/2 hidden h-px bg-mk-line md:block" />
          {PRODUCT_ORDER.map((k) => {
            const p = PRODUCTS[k]
            const here = current === k
            return (
              <li key={k} className="relative">
                <Link href={p.href} aria-current={here ? 'page' : undefined}
                  className={`mk-card mk-card-hover group flex h-full flex-col p-6 ${here ? '!border-mk-accent' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[0.8rem] text-mk-muted">Stage {p.stage}</span>
                    <ProductStatusBadge product={k} />
                  </div>
                  <h3 className="mt-6 text-[1.25rem] font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-1 text-[0.95rem] font-medium text-mk-slate">{p.tagline}</p>
                  {details?.[k] && <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-mk-muted">{details[k]}</p>}
                  <span className="mk-link mt-6 inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-mk-accent-text">
                    {here ? 'You’re here' : p.status === 'live' ? `Explore ${p.name}` : 'Learn more'}
                    {!here && <ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2} />}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </Container>
    </Section>
  )
}
