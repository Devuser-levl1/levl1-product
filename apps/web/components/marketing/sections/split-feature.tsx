import { Check } from 'lucide-react'
import type { SplitBlock } from '@/content/types'
import { Visual } from '../mocks/registry'
import { Container, Highlighted, Section, TextLink } from './primitives'

// Text on one side, real product UI on the other. Alternates with `reverse`.
export function SplitFeature({ block, reverse = false, tone = 'light' }: { block: SplitBlock; reverse?: boolean; tone?: 'light' | 'mist' }) {
  return (
    <Section tone={tone} className="!py-16 sm:!py-24">
      <Container>
        <SplitRow block={block} reverse={reverse} />
      </Container>
    </Section>
  )
}

export function SplitRow({ block, reverse = false }: { block: SplitBlock; reverse?: boolean }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div data-reveal className={reverse ? 'lg:order-2' : ''}>
        {block.eyebrow && <p className="mk-eyebrow mb-4 text-mk-purple">{block.eyebrow}</p>}
        <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] font-extrabold leading-[1.12] tracking-[-0.025em]"><Highlighted title={block.title} highlight={block.highlight} /></h2>
        {block.lead && <p className="mk-lead mt-5">{block.lead}</p>}
        {block.bullets && (
          <ul className="mt-7 space-y-3">
            {block.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-mk-slate">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-100 text-mk-purple"><Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} /></span>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        )}
        {block.link && <div className="mt-8"><TextLink cta={block.link} /></div>}
      </div>
      <div data-reveal="scale" style={{ ['--d' as string]: '120ms' }} className={reverse ? 'lg:order-1' : ''}>
        <Visual name={block.visual} />
      </div>
    </div>
  )
}
