import { Check } from 'lucide-react'
import type { Heading, Pillar } from '@/content/types'
import { Visual } from '../mocks/registry'
import { Container, Section, SectionHeading, TextLink } from './primitives'

// Pillars as proof: the promise, the evidence that backs it, then the real UI.
export function Pillars({ heading, pillars }: { heading: Heading; pillars: Pillar[] }) {
  return (
    <Section>
      <Container>
        <SectionHeading {...heading} />
        <div className="mt-20 space-y-24 sm:space-y-32">
          {pillars.map((p, i) => {
            const reverse = i % 2 === 1
            return (
              <div key={p.title} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                <div data-reveal className={reverse ? 'lg:order-2' : ''}>
                  <p className="mk-eyebrow mb-3">{p.eyebrow}</p>
                  <h3 className="text-[clamp(1.55rem,2.8vw,2.1rem)] font-semibold leading-[1.12] tracking-[-0.025em]">{p.title}</h3>
                  <p className="mk-lead mt-5">{p.promise}</p>
                  <ul className="mt-7 space-y-3">
                    {p.proof.map((b) => (
                      <li key={b} className="flex gap-3 text-mk-slate">
                        <Check aria-hidden className="mt-1 h-4 w-4 flex-none text-mk-accent-text" strokeWidth={2.4} />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                  {p.note && <p className="mt-6 border-l-2 border-mk-line pl-4 text-[0.92rem] leading-relaxed text-mk-muted">{p.note}</p>}
                  {p.link && <div className="mt-7"><TextLink cta={p.link} /></div>}
                </div>
                <div data-reveal="scale" style={{ ['--d' as string]: '120ms' }} className={reverse ? 'lg:order-1' : ''}>
                  <Visual name={p.visual} />
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
