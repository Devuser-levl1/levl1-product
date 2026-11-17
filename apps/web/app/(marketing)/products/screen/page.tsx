import { screen } from '@/content/screen'
import { home } from '@/content/home'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid } from '@/components/marketing/sections/grids'
import { SplitFeature } from '@/components/marketing/sections/split-feature'
import { Funnel } from '@/components/marketing/sections/funnel'
import { CTABand, StatementBand } from '@/components/marketing/sections/bands'
import { ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { ScreenRoomMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...screen.meta, path: '/products/screen', og: 'screen' })

export default function ScreenPage() {
  return (
    <>
      <Hero {...screen.hero} visual={<ScreenRoomMock />} />
      <FeatureGrid heading={screen.interview.heading} items={screen.interview.items} />
      <FeatureGrid heading={screen.modes.heading} items={screen.modes.items} tone="mist" />
      <SplitFeature block={screen.report} />
      <SplitFeature block={screen.candidate} tone="mist" reverse />
      <SplitFeature block={screen.approval} />
      <FeatureGrid heading={screen.operations.heading} items={screen.operations.items} columns={4} tone="mist" />
      <StatementBand heading={screen.integrity.heading} link={screen.integrity.link} tone="light" />
      <Funnel heading={{ eyebrow: 'What comes next', title: 'Stage 1 of your technical hiring funnel.' }} current="screen" details={home.funnel.details} />
      {/* TODO(abhijit): Screen customer proof — render nothing until verified. */}
      <ProofPlaceholder slot="screen" />
      <CTABand {...screen.cta} />
    </>
  )
}
