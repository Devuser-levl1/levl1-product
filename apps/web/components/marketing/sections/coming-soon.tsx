import { PRODUCTS, ROUTES, SOON_LABEL, type ProductKey } from '@/config/site'
import type { Heading, Item, Step } from '@/content/types'
import { EarlyAccessForm } from '../early-access-form'
import { Hero } from './hero'
import { FeatureGrid, ProblemGrid, Steps } from './grids'
import { Funnel } from './funnel'
import { Container, Section, SectionHeading } from './primitives'

export interface ComingSoonContent {
  product: ProductKey
  hero: { title: string; highlight?: string; lead: string }
  problem: { heading: Heading; items: Item[] }
  how: { heading: Heading; steps: Step[] }
  different: { heading: Heading; items: Item[] }
  earlyAccess: { title: string; lead: string; note: string }
}

// Shared layout for products that are in development. Everything is written
// in the future tense in content/products.ts — nothing here implies it exists.
export function ComingSoonPage({ content }: { content: ComingSoonContent }) {
  const p = PRODUCTS[content.product]
  return (
    <>
      <Hero badge={`Stage ${p.stage} · ${SOON_LABEL}`} {...content.hero}
        primary={{ label: 'Get early access', href: '#early-access' }}
        secondary={{ label: `Try ${PRODUCTS.screen.name} today`, href: ROUTES.screen }} />
      <ProblemGrid heading={content.problem.heading} items={content.problem.items} />
      <Steps heading={content.how.heading} steps={content.how.steps} />
      <FeatureGrid heading={content.different.heading} items={content.different.items} tone="mist" />
      <Section id="early-access">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <SectionHeading eyebrow="Early access" title={content.earlyAccess.title} lead={content.earlyAccess.lead} align="left" />
              <p data-reveal className="mt-6 border-l-2 border-mk-line pl-4 text-[0.95rem] leading-relaxed text-mk-muted">{content.earlyAccess.note}</p>
            </div>
            <div data-reveal="scale"><EarlyAccessForm productName={p.name} /></div>
          </div>
        </Container>
      </Section>
      <Funnel heading={{ eyebrow: 'The full funnel', title: 'Where this fits.' }} current={content.product} />
    </>
  )
}
