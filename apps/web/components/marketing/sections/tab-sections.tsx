import { Check } from 'lucide-react'
import type { Heading, TabItem } from '@/content/types'
import { Visual } from '../mocks/registry'
import { Container, Section, SectionHeading } from './primitives'
import { Tabs } from './tabs'

// A section of tabs, each with copy + one product visual on a panel
// (replaces rows of identical cards).
export function TabSection({ heading, items, label, tone = 'light' }: { heading: Heading; items: TabItem[]; label: string; tone?: 'light' | 'mist' }) {
  return (
    <Section tone={tone}>
      <Container>
        <SectionHeading {...heading} />
        <div data-reveal className="mt-10">
          <Tabs label={label} tabs={items.map((t) => ({
            id: t.id, label: t.label, shortLabel: t.shortLabel,
            panel: (
              <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                <div>
                  <h3 className="mk-h3">{t.title}</h3>
                  <p className="mt-3 leading-relaxed text-mk-slate">
                    {t.bodyShort ? <><span className="sm:hidden">{t.bodyShort}</span><span className="hidden sm:inline">{t.body}</span></> : t.body}
                  </p>
                  {t.bullets && (
                    <ul className="mt-6 space-y-2.5">
                      {t.bullets.map((b) => (
                        <li key={b} className="flex gap-3 text-mk-slate"><Check aria-hidden className="mt-1 h-4 w-4 flex-none text-mk-accent-text" strokeWidth={2.4} /><span className="leading-relaxed">{b}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mk-panel"><div className="mk-float rounded-xl"><Visual name={t.visual} /></div></div>
              </div>
            ),
          }))} />
        </div>
      </Container>
    </Section>
  )
}
