import { iaas } from '@/content/company'
import { pageMetadata } from '@/lib/marketing/metadata'
import { Hero } from '@/components/marketing/sections/hero'
import { FeatureGrid, Steps } from '@/components/marketing/sections/grids'
import { CTABand } from '@/components/marketing/sections/bands'

export const metadata = pageMetadata({ ...iaas.meta, path: '/services/interview-as-a-service', og: 'iaas' })

export default function IaaSPage() {
  return (
    <>
      <Hero {...iaas.hero} compact />
      <FeatureGrid items={iaas.items} columns={3} />
      <Steps heading={iaas.steps.heading} steps={iaas.steps.items} tone="mist" />
      <CTABand {...iaas.cta} />
    </>
  )
}
