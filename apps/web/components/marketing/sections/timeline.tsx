import type { Heading, TimelineStep } from '@/content/types'
import { Container, Section, SectionHeading } from './primitives'

// "One interview, minute by minute" — the site's signature: concrete moments,
// each with a line of evidence. Phones: one column per step (time, then
// title/body/evidence on the same left edge — a fixed label column clipped
// "Before"). The big ink time label and its paper background (which masks the
// connector line) only apply where that line exists.
export function InterviewTimeline({ heading, steps, caption }: { heading: Heading; steps: TimelineStep[]; caption?: string }) {
  return (
    <Section tone="mist">
      <Container>
        <SectionHeading {...heading} />
        <ol data-reveal className="mk-funnel relative mt-14 grid gap-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          <div aria-hidden className="mk-funnel-line absolute left-0 right-0 top-[1.15rem] hidden h-px bg-mk-line lg:block" />
          {steps.map((s, i) => (
            <li key={s.time + s.title} className="relative min-w-0" style={{ ['--d' as string]: `${i * 80}ms` }}>
              <p className="mk-mono text-[0.85rem] font-medium leading-none text-mk-muted md:text-[1.35rem] md:tracking-tight md:text-mk-ink lg:relative lg:z-10 lg:w-fit lg:bg-mk-mist lg:pr-3">{s.time}</p>
              <div className="mt-2.5 min-w-0 md:mt-5">
                <h3 className="text-[1.05rem] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mk-slate">{s.body}</p>
                <p className="mk-mono-sm mt-2.5 flex items-baseline gap-2 text-[0.75rem] leading-snug text-mk-muted sm:mt-3 sm:text-mk-ink">
                  <span aria-hidden className={`h-1.5 w-1.5 flex-none translate-y-[-1px] rounded-full ${s.tone === 'pass' ? 'bg-mk-pass' : s.tone === 'flag' ? 'bg-mk-flag' : 'bg-mk-muted'}`} />
                  {s.evidence}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {caption && <p data-reveal className="mt-10 text-[0.88rem] text-mk-muted">{caption}</p>}
      </Container>
    </Section>
  )
}
