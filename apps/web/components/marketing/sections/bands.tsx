import { Plus } from 'lucide-react'
import type { CTA, FAQItem, Heading } from '@/content/types'
import { GradientMesh } from '../motion/gradient-mesh'
import { ButtonLink, Container, Highlighted, Section, SectionHeading, TextLink } from './primitives'

export function CTABand({ title, highlight, lead, primary, secondary }: { title: string; highlight?: string; lead?: string; primary: CTA; secondary?: CTA }) {
  return (
    <section className="relative overflow-hidden bg-[#140F35] py-24 text-white sm:py-32">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.55),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(37,99,235,0.45),transparent_55%)]" />
      <GradientMesh dark className="opacity-50" />
      <Container className="relative text-center">
        <h2 data-reveal className="mk-h2 mx-auto max-w-3xl"><Highlighted title={title} highlight={highlight} /></h2>
        {lead && <p data-reveal className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-violet-100/80">{lead}</p>}
        <div data-reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink cta={primary} variant="light" />
          {secondary && <ButtonLink cta={secondary} variant="onDark" />}
        </div>
      </Container>
    </section>
  )
}

// A short statement band with one link — e.g. the integrity promise on Home.
export function StatementBand({ heading, link, aside, tone = 'mist' }: { heading: Heading; link?: CTA; aside?: React.ReactNode; tone?: 'light' | 'mist' | 'dark' }) {
  const dark = tone === 'dark'
  return (
    <Section tone={tone}>
      {dark && <GradientMesh dark className="opacity-50" />}
      <Container className="relative">
        <div className={aside ? 'grid items-center gap-12 lg:grid-cols-2 lg:gap-20' : ''}>
          <div data-reveal className={aside ? '' : 'mx-auto max-w-3xl text-center'}>
            {heading.eyebrow && <p className={`mk-eyebrow mb-4 ${dark ? 'text-violet-300' : 'text-mk-purple'}`}>{heading.eyebrow}</p>}
            <h2 className="mk-h2"><Highlighted title={heading.title} highlight={heading.highlight} /></h2>
            {heading.lead && <p className={`mk-lead mt-5 ${dark ? '!text-slate-300' : ''}`}>{heading.lead}</p>}
            {link && <div className="mt-8"><TextLink cta={link} dark={dark} /></div>}
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
              <summary className="flex items-center justify-between gap-6 rounded-lg py-5 text-left text-[1.05rem] font-semibold tracking-tight">
                {f.q}
                <Plus aria-hidden className="mk-plus h-5 w-5 flex-none text-mk-purple" strokeWidth={2.2} />
              </summary>
              <p className="pb-6 pr-10 leading-relaxed text-mk-slate">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  )
}
