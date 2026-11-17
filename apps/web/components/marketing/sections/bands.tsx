import { Plus } from 'lucide-react'
import type { CTA, FAQItem, Heading } from '@/content/types'
import { ButtonLink, Container, Highlighted, Section, SectionHeading, TextLink } from './primitives'

// The one inverted band on a page — the final call to action.
export function CTABand({ title, highlight, lead, primary, secondary }: { title: string; highlight?: string; lead?: string; primary: CTA; secondary?: CTA }) {
  return (
    <section className="relative bg-mk-bg py-16 sm:py-24">
      <Container>
        <div className="rounded-2xl px-6 py-16 text-center sm:px-12 sm:py-20" style={{ background: 'rgb(var(--mk-invert-bg))', color: 'rgb(var(--mk-invert-ink))' }}>
          <h2 data-reveal className="mk-h2 mx-auto max-w-3xl">{highlight ? <Highlighted title={title} highlight={highlight} /> : title}</h2>
          {lead && <p data-reveal className="mx-auto mt-5 max-w-xl text-lg leading-relaxed" style={{ color: 'rgb(var(--mk-invert-muted))' }}>{lead}</p>}
          <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink cta={primary} variant="light" />
            {secondary && <ButtonLink cta={secondary} variant="onDark" />}
          </div>
        </div>
      </Container>
    </section>
  )
}

// A short statement band with one link — e.g. the integrity promise.
export function StatementBand({ heading, link, aside, tone = 'mist' }: { heading: Heading; link?: CTA; aside?: React.ReactNode; tone?: 'light' | 'mist' | 'dark' }) {
  return (
    <Section tone={tone === 'dark' ? 'mist' : tone}>
      <Container>
        <div className={aside ? 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20' : ''}>
          <div data-reveal className={aside ? '' : 'max-w-3xl'}>
            {heading.eyebrow && <p className="mk-eyebrow mb-3">{heading.eyebrow}</p>}
            <h2 className="mk-h2"><Highlighted title={heading.title} highlight={heading.highlight} /></h2>
            {heading.lead && <p className="mk-lead mt-5">{heading.lead}</p>}
            {link && <div className="mt-8"><TextLink cta={link} /></div>}
          </div>
          {aside && <div data-reveal="scale" style={{ ['--d' as string]: '120ms' }}>{aside}</div>}
        </div>
      </Container>
    </Section>
  )
}

// Native <details> accordion: accessible and keyboard-operable with zero JS.
export function FAQ({ heading, items, tone = 'light' }: { heading: Heading; items: FAQItem[]; tone?: 'light' | 'mist' }) {
  return (
    <Section tone={tone}>
      <Container>
        <SectionHeading {...heading} />
        <div className="mx-auto mt-12 max-w-3xl divide-y divide-mk-line border-y border-mk-line">
          {items.map((f) => (
            <details key={f.q} className="mk-faq group py-1">
              <summary className="flex items-center justify-between gap-6 rounded-md py-5 text-left text-[1.02rem] font-medium tracking-tight">
                {f.q}
                <Plus aria-hidden className="mk-plus h-4 w-4 flex-none text-mk-muted" strokeWidth={2} />
              </summary>
              <p className="pb-6 pr-10 leading-relaxed text-mk-slate">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  )
}
