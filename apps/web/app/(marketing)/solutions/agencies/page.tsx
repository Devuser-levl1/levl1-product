import { agencies } from '@/content/solutions'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { ProblemGrid } from '@/components/marketing/sections/grids'
import { SplitRow } from '@/components/marketing/sections/split-feature'
import { CTABand, StatementBand } from '@/components/marketing/sections/bands'
import { Container, Section, ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { SubmitSheetMock } from '@/components/marketing/mocks/hirepilot'

export const metadata = pageMetadata({ ...agencies.meta, path: '/solutions/agencies', og: 'agencies' })

export default function AgenciesPage() {
  return (
    <>
      <Hero {...agencies.hero} visual={<div role="img" aria-label="HirePilot send-to-client view with selected candidates in a summary sheet."><div aria-hidden><SubmitSheetMock /></div></div>} />
      <ProblemGrid heading={agencies.pains.heading} items={agencies.pains.items} />
      <Section>
        <Container className="space-y-24 sm:space-y-32">
          {agencies.splits.map((b, i) => <SplitRow key={b.title} block={b} reverse={i % 2 === 1} />)}
        </Container>
      </Section>
      <StatementBand heading={agencies.premium.heading} tone="dark" />
      {/* TODO(abhijit): agency customer proof — render nothing until verified. */}
      <ProofPlaceholder slot="agencies" />
      <CTABand {...agencies.cta} />
    </>
  )
}
