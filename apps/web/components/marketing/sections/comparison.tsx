import { ArrowRight } from 'lucide-react'
import type { ComparisonRow, Heading } from '@/content/types'
import { Container, Section, SectionHeading } from './primitives'

// "Today → With Screen": the problem and the outcome in one place, row by row.
// Phones: each label sits on its own line above its sentence (inline labels
// made every row start ragged).
export function Comparison({ heading, rows, todayLabel = 'Today', withLabel }: { heading: Heading; rows: ComparisonRow[]; todayLabel?: string; withLabel: string }) {
  return (
    <Section>
      <Container>
        <SectionHeading {...heading} />
        <div data-reveal className="mt-12 overflow-hidden rounded-2xl border border-mk-line bg-mk-surface">
          <div className="hidden grid-cols-[1fr_auto_1fr] border-b border-mk-line px-6 py-3 md:grid">
            <p className="mk-eyebrow">{todayLabel}</p><span className="w-10" /><p className="mk-eyebrow !text-mk-accent-text">{withLabel}</p>
          </div>
          <ul className="divide-y divide-mk-line">
            {rows.map((r) => (
              <li key={r.today} className="grid gap-3 px-5 py-5 sm:px-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-0">
                <p className="text-mk-slate"><span className="mk-eyebrow mb-1 block md:hidden">{todayLabel}</span>{r.today}</p>
                <ArrowRight aria-hidden className="mx-auto hidden h-4 w-10 text-mk-muted md:block" strokeWidth={1.75} />
                <p className="font-medium text-mk-ink"><span className="mk-eyebrow mb-1 block !text-mk-accent-text md:hidden">{withLabel}</span>{r.withScreen}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  )
}
