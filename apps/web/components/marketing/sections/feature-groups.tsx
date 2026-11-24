import type { IconName } from '@/config/site'
import type { Heading } from '@/content/types'
import { Icon } from '../icon'
import { Container, Section, SectionHeading } from './primitives'

export interface FeatureGroup { id: string; icon: IconName; title: string; lead: string; items: { title: string; body: string }[] }

// A full feature list, grouped. Each group is one hairline row: the group's
// name and promise on the left (sticky on wide screens), its features on the
// right. Flat — no cards, no tiles.
export function FeatureGroups({ heading, groups, tone = 'light' }: { heading: Heading; groups: FeatureGroup[]; tone?: 'light' | 'mist' }) {
  return (
    <Section tone={tone}>
      <Container>
        <SectionHeading {...heading} />
        <div className="mt-14 border-b border-mk-line">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`fg-${g.id}`} data-reveal className="grid gap-6 border-t border-mk-line py-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16 lg:py-14">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Icon name={g.icon} className="h-5 w-5 text-mk-accent-text" strokeWidth={1.75} />
                <h3 id={`fg-${g.id}`} className="mk-h3 mt-4">{g.title}</h3>
                <p className="mt-2 max-w-[22rem] leading-relaxed text-mk-slate">{g.lead}</p>
              </div>
              <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {g.items.map((it) => (
                  <li key={it.title} className="min-w-0">
                    <h4 className="text-[1rem] font-semibold tracking-tight text-mk-ink">{it.title}</h4>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mk-slate">{it.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </Section>
  )
}
