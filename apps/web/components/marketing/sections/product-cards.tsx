import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Heading, VisualKey } from '@/content/types'
import { Visual } from '../mocks/registry'
import { Container, Section, SectionHeading } from './primitives'

export interface ProductCardData { name: string; tag: string; title: string; body: string; href: string; cta: string; visual: VisualKey }

export function ProductCards({ heading, products }: { heading: Heading; products: ProductCardData[] }) {
  return (
    <Section tone="mist">
      <Container>
        <SectionHeading {...heading} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {products.map((p, i) => (
            <Link key={p.href} href={p.href} data-reveal style={{ ['--d' as string]: `${i * 100}ms` }}
              className="mk-card mk-card-hover group flex flex-col overflow-hidden !rounded-[2rem] p-7 sm:p-9">
              <p className="mk-eyebrow text-mk-purple">{p.tag}</p>
              <h3 className="mt-3 text-[1.75rem] font-extrabold tracking-[-0.025em]">{p.name}</h3>
              <p className="mt-2 text-lg font-semibold text-mk-ink/80">{p.title}</p>
              <p className="mt-3 leading-relaxed text-mk-slate">{p.body}</p>
              <div className="mt-8 flex-1 [&>*]:transition-transform [&>*]:duration-500 group-hover:[&>*]:-translate-y-1">
                <Visual name={p.visual} />
              </div>
              <span className="mk-link mt-8 inline-flex items-center gap-1.5 font-semibold text-mk-purple">{p.cta}<ArrowRight aria-hidden className="mk-arrow h-4 w-4" strokeWidth={2.2} /></span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  )
}
