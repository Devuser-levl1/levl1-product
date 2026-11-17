import type { Heading, TimelineStep } from '@/content/types'
import { Container, Section, SectionHeading } from './primitives'

// "One interview, minute by minute" — the site's signature: concrete moments,
// each with a line of evidence. Vertical on phones, a stepped grid on desktop.
export function InterviewTimeline({ heading, steps, caption }: { heading: Heading; steps: TimelineStep[]; caption?: string }) {
  return (
    <Section tone="mist">
      <Container>
        <SectionHeading {...heading} />
        <ol data-reveal className="mk-funnel relative mt-14 grid gap-8 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          <div aria-hidden className="mk-funnel-line absolute left-0 right-0 top-[1.15rem] hidden h-px bg-mk-line lg:block" />
          {steps.map((s, i) => (
            <li key={s.time + s.title} className="relative grid grid-cols-[3.5rem_1fr] gap-4 md:block" style={{ ['--d' as string]: `${i * 80}ms` }}>
              <p className="mk-mono relative z-10 w-fit bg-mk-mist pr-3 text-[1.35rem] font-medium leading-none tracking-tight text-mk-ink">{s.time}</p>
              <div className="md:mt-5">
                <h3 className="text-[1.05rem] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-mk-slate">{s.body}</p>
                <p className="mk-mono mt-3 flex items-baseline gap-2 text-[0.75rem] leading-snug text-mk-ink">
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
