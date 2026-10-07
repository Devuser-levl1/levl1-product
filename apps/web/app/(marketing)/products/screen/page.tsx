import { screen } from '@/content/screen'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid } from '@/components/marketing/sections/grids'
import { SplitFeature } from '@/components/marketing/sections/split-feature'
import { CTABand, StatementBand } from '@/components/marketing/sections/bands'
import { ProofPlaceholder } from '@/components/marketing/sections/primitives'
import { ScreenRoomMock } from '@/components/marketing/mocks/screen'

export const metadata = pageMetadata({ ...screen.meta, path: '/products/screen', og: 'screen' })

export default function ScreenPage() {
  return (
    <>
      <Hero {...screen.hero} visual={<ScreenRoomMock />} />
      <FeatureGrid heading={screen.interview.heading} items={screen.interview.items} />
      <SplitFeature block={screen.candidate} tone="mist" />
      <SplitFeature block={screen.report} reverse />
      <SplitFeature block={screen.approval} tone="mist" />
      <StatementBand heading={screen.integrity.heading} link={screen.integrity.link} tone="dark" />
      {/* TODO(abhijit): Screen customer proof — render nothing until verified. */}
      <ProofPlaceholder slot="screen" />
      <CTABand {...screen.cta} />
    </>
  )
}
