import { hirepilot } from '@/content/hirepilot'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid } from '@/components/marketing/sections/grids'
import { SplitRow } from '@/components/marketing/sections/split-feature'
import { CTABand, StatementBand } from '@/components/marketing/sections/bands'
import { Container, Section, ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { KanbanMock } from '@/components/marketing/mocks'

export const metadata = pageMetadata({ ...hirepilot.meta, path: '/products/hirepilot', og: 'hirepilot' })

export default function HirePilotPage() {
  return (
    <>
      <Hero {...hirepilot.hero} visual={<div role="img" aria-label="HirePilot pipeline board with candidates moving through stages."><div aria-hidden><KanbanMock /></div></div>} />
      <Section>
        <Container className="space-y-24 sm:space-y-32">
          {hirepilot.splits.map((b, i) => <SplitRow key={b.title} block={b} reverse={i % 2 === 1} />)}
        </Container>
      </Section>
      <FeatureGrid heading={hirepilot.more.heading} items={hirepilot.more.items} columns={4} tone="mist" />
      <StatementBand heading={hirepilot.standalone.heading} tone="light" />
      {/* TODO(abhijit): HirePilot customer proof — render nothing until verified. */}
      <ProofPlaceholder slot="hirepilot" />
      <CTABand {...hirepilot.cta} />
    </>
  )
}
