import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import { PRODUCTS, PRODUCT_ORDER, type ProductKey } from '@/config/site'
import type { Heading } from '@/content/types'
import { ProductStatusBadge } from './badge'
import { Container, Section, SectionHeading } from './primitives'

// The three-stage technical hiring funnel as one stepped band, read entirely
// from config/site.ts. `current` marks the product page you're on.
export function Funnel({ heading, current, details }: { heading: Heading; current?: ProductKey; details?: Partial<Record<ProductKey, string>> }) {
  return (
    <Section>
      <Container>
        <SectionHeading {...heading} />
        <ol data-reveal className="mt-12 grid overflow-hidden rounded-2xl border border-mk-line bg-mk-surface md:grid-cols-3">
          {PRODUCT_ORDER.map((k, i) => {
            const p = PRODUCTS[k]
            const here = current === k
            return (
              <li key={k} className={`relative ${i > 0 ? 'border-t border-mk-line md:border-l md:border-t-0' : ''} ${here ? 'bg-mk-accent-tint' : ''}`}>
                <Link href={p.href} aria-current={here ? 'page' : undefined} className="group flex h-full flex-col p-6 transition-colors hover:bg-mk-sunken/60 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="mk-mono text-[0.78rem] text-mk-muted">Stage {p.stage}</span>
                    <ProductStatusBadge product={k} />
                  </div>
                  <h3 className="mk-h3 mt-4 md:mt-6">{p.name}</h3>
                  <p className="mt-1 text-[0.95rem] font-medium text-mk-slate">{p.tagline}</p>
                  {details?.[k] && <p className="mt-3 hidden flex-1 text-[0.95rem] leading-relaxed text-mk-muted md:block">{details[k]}</p>}
                  <span className="mk-link mt-auto inline-flex min-h-[44px] items-center pt-4 md:pt-6 gap-1.5 text-[0.92rem] font-medium text-mk-accent-text">
                    {here ? 'You’re here' : p.status === 'live' ? `Explore ${p.name}` : 'Learn more'}
                    {!here && <ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2} />}
                  </span>
                </Link>
                {i < PRODUCT_ORDER.length - 1 && (
                  <span aria-hidden className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-mk-line bg-mk-surface text-mk-muted md:flex">
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </Container>
    </Section>
  )
}
