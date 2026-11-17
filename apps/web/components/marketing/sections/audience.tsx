import { Check } from 'lucide-react'
import type { Audience, Heading } from '@/content/types'
import { Container, Section, SectionHeading } from './primitives'

// "Built for both" — two audiences side by side, hiring managers first.
export function AudienceSplit({ heading, audiences }: { heading: Heading; audiences: Audience[] }) {
  return (
    <Section tone="mist">
      <Container>
        <SectionHeading {...heading} />
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {audiences.map((a, i) => (
            <div key={a.label} data-reveal style={{ ['--d' as string]: `${i * 90}ms` }} className="mk-card p-7 sm:p-9">
              <p className="mk-eyebrow">{a.label}</p>
              <h3 className="mt-3 text-[1.35rem] font-semibold tracking-tight">{a.title}</h3>
              <ul className="mt-6 space-y-3">
                {a.points.map((pt) => (
                  <li key={pt} className="flex gap-3 text-mk-slate">
                    <Check aria-hidden className="mt-1 h-4 w-4 flex-none text-mk-accent-text" strokeWidth={2.4} />
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
