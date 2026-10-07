import { enterprise } from '@/content/solutions'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid, ProblemGrid } from '@/components/marketing/sections/grids'
import { SplitRow } from '@/components/marketing/sections/split-feature'
import { CTABand } from '@/components/marketing/sections/bands'
import { Container, Section, TextLink, ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { ScreenReportMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...enterprise.meta, path: '/solutions/enterprise', og: 'enterprise' })

export default function EnterprisePage() {
  return (
    <>
      <Hero {...enterprise.hero} visual={<ScreenReportMock />} />
      <ProblemGrid heading={enterprise.pains.heading} items={enterprise.pains.items} />
      <Section>
        <Container className="space-y-24 sm:space-y-32">
          {enterprise.splits.map((b, i) => <SplitRow key={b.title} block={b} reverse={i % 2 === 1} />)}
        </Container>
      </Section>
      <FeatureGrid heading={enterprise.readiness.heading} items={enterprise.readiness.items} tone="mist" />
      <div className="-mt-12 bg-mk-mist pb-20 text-center sm:-mt-16"><TextLink cta={enterprise.readiness.link} /></div>
      {/* TODO(abhijit): enterprise customer proof — render nothing until verified. */}
      <ProofPlaceholder slot="enterprise" />
      <CTABand {...enterprise.cta} />
    </>
  )
}
