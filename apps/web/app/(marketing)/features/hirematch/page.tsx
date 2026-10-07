import { hirematch } from '@/content/features'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid, Steps } from '@/components/marketing/sections/grids'
import { CTABand } from '@/components/marketing/sections/bands'
import { HireMatchMock } from '@/components/marketing/mocks/hirematch'

export const metadata = pageMetadata({ ...hirematch.meta, path: '/features/hirematch', og: 'hirematch' })

export default function HireMatchPage() {
  return (
    <>
      <Hero {...hirematch.hero} visual={<HireMatchMock />} />
      <FeatureGrid heading={hirematch.how.heading} items={hirematch.how.items} />
      <Steps heading={hirematch.steps.heading} steps={hirematch.steps.items} tone="mist" />
      <CTABand {...hirematch.cta} />
    </>
  )
}
