import type { Heading, Item, Step } from '@/content/types'
import { Icon } from '../icon'
import { Container, Section, SectionHeading } from './primitives'

// Pain points — numbered hairline grid, read as tension before the answer.
export function ProblemGrid({ heading, items }: { heading: Heading; items: Item[] }) {
  const cols = items.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
  return (
    <Section tone="mist">
      <Container>
        <SectionHeading {...heading} />
        <div className={`mt-14 grid gap-px overflow-hidden rounded-xl border border-mk-line bg-mk-line ${cols}`}>
          {items.map((it, i) => (
            <div key={it.title} data-reveal style={{ ['--d' as string]: `${i * 70}ms` }} className="bg-mk-surface p-7">
              <p className="font-mono text-[0.8rem] text-mk-muted">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mk-h3 mt-6">{it.title}</h3>
              <p className="mt-3 leading-relaxed text-mk-slate">{it.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function FeatureGrid({ heading, items, columns = 3, tone = 'light' }: { heading?: Heading; items: Item[]; columns?: 2 | 3 | 4 | 5; tone?: 'light' | 'mist' }) {
  const cols = columns === 2 ? 'md:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : columns === 5 ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <Section tone={tone}>
      <Container>
        {heading && <SectionHeading {...heading} />}
        <div className={`grid gap-4 ${heading ? 'mt-14' : ''} ${cols}`}>
          {items.map((it, i) => (
            <div key={it.title} data-reveal style={{ ['--d' as string]: `${(i % 3) * 70}ms` }} className="mk-card mk-card-hover p-6">
              {it.icon && <span className="mk-icon-tile mb-5"><Icon name={it.icon} className="h-[18px] w-[18px]" /></span>}
              <h3 className="text-[1.05rem] font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 leading-relaxed text-mk-slate">{it.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function Steps({ heading, steps, tone = 'light', footnote }: { heading: Heading; steps: Step[]; tone?: 'light' | 'mist'; footnote?: string }) {
  const cols = steps.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'
  return (
    <Section tone={tone}>
      <Container>
        <SectionHeading {...heading} />
        <ol data-reveal className={`mk-funnel relative mt-16 grid gap-10 ${cols}`}>
          <div aria-hidden className="mk-funnel-line absolute left-0 right-0 top-5 hidden h-px bg-mk-line md:block" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-mk-line bg-mk-surface font-mono text-[0.85rem] font-medium text-mk-ink">{i + 1}</span>
              <h3 className="mt-6 text-[1.05rem] font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-mk-slate">{s.body}</p>
            </li>
          ))}
        </ol>
        {footnote && <p data-reveal className="mt-12 text-center text-sm text-mk-muted">{footnote}</p>}
      </Container>
    </Section>
  )
}

/** Outcome strip — short value statements in one hairline row. No numbers. */
export function OutcomeStrip({ heading, items }: { heading: Heading; items: Item[] }) {
  return (
    <Section>
      <Container>
        <SectionHeading {...heading} />
        <ul className="mt-14 grid gap-x-8 gap-y-10 border-t border-mk-line pt-10 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((it, i) => (
            <li key={it.title} data-reveal style={{ ['--d' as string]: `${i * 70}ms` }}>
              {it.icon && <Icon name={it.icon} className="h-5 w-5 text-mk-accent-text" />}
              <h3 className="mt-4 text-[1rem] font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mk-slate">{it.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
