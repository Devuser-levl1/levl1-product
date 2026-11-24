import type { Heading } from '@/content/types'
import { Container, Section, SectionHeading } from './primitives'

export interface Phase { label: string; title: string; points: string[] }

// Before / during / after — a few phases, each a short list, on one hairline
// surface. Stacks on phones; columns from md up.
export function Phases({ heading, phases, tone = 'light' }: { heading: Heading; phases: Phase[]; tone?: 'light' | 'mist' }) {
  return (
    <Section tone={tone}>
      <Container>
        <SectionHeading {...heading} />
        <ol data-reveal className="mt-12 grid overflow-hidden rounded-2xl border border-mk-line bg-mk-surface md:grid-cols-3">
          {phases.map((p, i) => (
            <li key={p.label} className={`min-w-0 p-6 sm:p-8 ${i > 0 ? 'border-t border-mk-line md:border-l md:border-t-0' : ''}`}>
              <p className="mk-eyebrow">{String(i + 1).padStart(2, '0')} · {p.label}</p>
              <h3 className="mt-4 text-[1.2rem] font-semibold tracking-tight">{p.title}</h3>
              <ul className="mt-5 space-y-3">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-3 text-[0.95rem] leading-relaxed text-mk-slate">
                    <span aria-hidden className="mt-[0.6rem] h-1 w-1 flex-none rounded-full bg-mk-muted" />{pt}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  )
}
