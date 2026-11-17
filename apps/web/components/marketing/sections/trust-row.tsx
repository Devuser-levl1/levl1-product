import type { CTA, Heading, Item } from '@/content/types'
import { Icon } from '../icon'
import { Container, Section, SectionHeading, TextLink } from './primitives'

// A compact hairline strip of short facts (trust facts, interview modes…) —
// one connected surface instead of a row of identical cards. Optional link
// sits inline with the heading.
export function TrustRow({ heading, items, link, columns = 4, tone = 'light' }: { heading: Heading; items: Item[]; link?: CTA; columns?: 3 | 4; tone?: 'light' | 'mist' }) {
  const lg = columns === 3 ? 'md:grid-cols-3 md:divide-x md:divide-y-0' : 'grid-cols-2 lg:grid-cols-4 lg:divide-x'
  return (
    <Section tone={tone}>
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading {...heading} />
          {link && <div data-reveal><TextLink cta={link} /></div>}
        </div>
        <ul data-reveal className={`mt-10 grid rounded-2xl border border-mk-line bg-mk-surface ${columns === 4 ? '' : 'divide-y divide-mk-line'} ${lg}`}>
          {items.map((it, i) => (
            <li key={it.title} className={`p-5 sm:p-7 ${columns === 4 && i > 1 ? 'border-t border-mk-line lg:border-t-0' : ''} ${columns === 4 && i % 2 === 1 ? 'border-l border-mk-line lg:border-l-0' : ''}`}>
              {it.icon && <Icon name={it.icon} className="h-5 w-5 text-mk-ink" strokeWidth={1.75} />}
              <h3 className="mt-4 text-[1.05rem] font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mk-slate">{it.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
