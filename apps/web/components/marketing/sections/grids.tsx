import type { Heading, Item, Step } from '@/content/types'
import { Icon } from '../icon'
import { GradientMesh } from '../motion/gradient-mesh'
import { Container, Section, SectionHeading } from './primitives'

// Pain points — a dark band so the problem reads as tension before the answer.
export function ProblemGrid({ heading, items }: { heading: Heading; items: Item[] }) {
  return (
    <Section tone="dark">
      <GradientMesh dark className="opacity-60" />
      <Container className="relative">
        <SectionHeading {...heading} dark />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map((it, i) => (
            <div key={it.title} data-reveal style={{ ['--d' as string]: `${i * 90}ms` }}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm transition-colors duration-300 hover:border-violet-400/40 hover:bg-white/[0.07]">
              {it.icon && <span className="mk-icon-tile mk-icon-tile-dark mb-5"><Icon name={it.icon} /></span>}
              <h3 className="mk-h3 text-white">{it.title}</h3>
              <p className="mt-3 leading-relaxed text-slate-300">{it.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function FeatureGrid({ heading, items, columns = 3, tone = 'light' }: { heading?: Heading; items: Item[]; columns?: 2 | 3 | 4; tone?: 'light' | 'mist' }) {
  const cols = columns === 2 ? 'md:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'
  return (
    <Section tone={tone}>
      <Container>
        {heading && <SectionHeading {...heading} />}
        <div className={`grid gap-5 ${heading ? 'mt-14' : ''} ${cols}`}>
          {items.map((it, i) => (
            <div key={it.title} data-reveal style={{ ['--d' as string]: `${(i % 3) * 80}ms` }} className="mk-card mk-card-hover p-7">
              {it.icon && <span className="mk-icon-tile mb-5"><Icon name={it.icon} /></span>}
              <h3 className="text-[1.125rem] font-bold tracking-tight">{it.title}</h3>
              <p className="mt-2.5 leading-relaxed text-mk-slate">{it.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function Steps({ heading, steps, tone = 'light', footnote }: { heading: Heading; steps: Step[]; tone?: 'light' | 'mist'; footnote?: string }) {
  return (
    <Section tone={tone}>
      <Container>
        <SectionHeading {...heading} />
        <ol className={`relative mt-16 grid gap-8 ${steps.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent lg:block" />
          {steps.map((s, i) => (
            <li key={s.title} data-reveal style={{ ['--d' as string]: `${i * 110}ms` }} className="relative">
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-mk-purple via-mk-indigo to-mk-blue text-lg font-extrabold text-white shadow-[0_12px_30px_-10px_rgba(79,70,229,0.6)]">{i + 1}</span>
              <h3 className="mt-6 text-[1.125rem] font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2.5 leading-relaxed text-mk-slate">{s.body}</p>
            </li>
          ))}
        </ol>
        {footnote && <p data-reveal className="mt-12 text-center text-sm text-mk-muted">{footnote}</p>}
      </Container>
    </Section>
  )
}
